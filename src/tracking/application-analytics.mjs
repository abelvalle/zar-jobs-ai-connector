import { APPLICATION_STATUSES } from "./application-tracker.mjs";

export const ANALYTICS_GROUPS = Object.freeze(["portal", "role", "resumeVariant", "fitBand"]);

const MAX_RECORDS = 500;
const MIN_COMPARISON_SAMPLE = 5;
const DATE_FIELDS = [
  "createdAt", "appliedAt", "respondedAt", "interviewAt", "offerAt", "hiredAt", "rejectedAt",
];

export function analyzeApplicationFunnel(records, asOf, groups = ANALYTICS_GROUPS) {
  const date = validDate(asOf, "asOf");
  const selectedGroups = validateGroups(groups);
  const applications = validateAnalyticsRecords(records, date);
  const observations = applications.map(stageObservation);
  const overall = funnelMetrics(observations);
  const segments = Object.fromEntries(selectedGroups.map((group) => [
    group,
    segmentMetrics(observations, group),
  ]));
  const responseDurations = applications
    .filter((record) => record.appliedAt && record.respondedAt)
    .map((record) => daysBetween(record.appliedAt, record.respondedAt))
    .sort((left, right) => left - right);

  return {
    asOf: date,
    overall,
    segments,
    timing: {
      explicitResponseSamples: responseDurations.length,
      medianDaysToResponse: median(responseDurations),
      inferredStageDatesExcluded: true,
    },
    dataQuality: {
      totalRecords: applications.length,
      missingAppliedAt: applications.filter((record) => !record.appliedAt).length,
      unknownPortal: applications.filter((record) => !record.sourcePortal).length,
      unknownResumeVariant: applications.filter((record) => !record.resumeVariant).length,
      unknownFitScore: applications.filter((record) => record.fitScore === undefined).length,
      comparisonMinimumApplied: MIN_COMPARISON_SAMPLE,
    },
    method: "observed-application-funnel-v1",
    causalAnalysisPerformed: false,
    rankingPerformed: false,
    recommendationsGenerated: false,
    externalDataVerified: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "Observed rates describe only the supplied records. They do not establish that a portal, role, score, or resume variant caused an outcome; selection effects and missing history may dominate.",
  };
}

function validateAnalyticsRecords(records, asOf) {
  if (!Array.isArray(records) || records.length > MAX_RECORDS) {
    throw new TypeError(`records must be an array with at most ${MAX_RECORDS} applications`);
  }
  const seen = new Set();
  return records.map((record, index) => {
    if (!isPlainObject(record)) throw new TypeError(`records[${index}] must be an object`);
    const normalized = {
      id: requiredText(record.id, `records[${index}].id`, 200),
      company: requiredText(record.company, `records[${index}].company`, 200),
      role: requiredText(record.role, `records[${index}].role`, 200),
      status: record.status,
      createdAt: validDate(record.createdAt, `records[${index}].createdAt`),
    };
    if (seen.has(normalized.id)) throw new Error(`duplicate application id: ${normalized.id}`);
    seen.add(normalized.id);
    if (!APPLICATION_STATUSES.includes(record.status)) {
      throw new Error(`records[${index}].status is not supported`);
    }
    for (const field of DATE_FIELDS.slice(1)) {
      if (record[field] !== undefined && record[field] !== null) {
        normalized[field] = validDate(record[field], `records[${index}].${field}`);
      }
    }
    for (const field of DATE_FIELDS) {
      if (normalized[field] && normalized[field] > asOf) {
        throw new Error(`records[${index}].${field} cannot be after asOf`);
      }
      if (field !== "createdAt" && normalized[field] && normalized[field] < normalized.createdAt) {
        throw new Error(`records[${index}].${field} cannot precede createdAt`);
      }
    }
    if (normalized.appliedAt) {
      for (const field of ["respondedAt", "interviewAt", "offerAt", "hiredAt", "rejectedAt"]) {
        if (normalized[field] && normalized[field] < normalized.appliedAt) {
          throw new Error(`records[${index}].${field} cannot precede appliedAt`);
        }
      }
    }
    if (record.sourcePortal !== undefined) {
      normalized.sourcePortal = requiredText(record.sourcePortal, `records[${index}].sourcePortal`, 100);
    }
    if (record.resumeVariant !== undefined) {
      normalized.resumeVariant = requiredText(record.resumeVariant, `records[${index}].resumeVariant`, 200);
    }
    if (record.fitScore !== undefined) {
      if (typeof record.fitScore !== "number" || !Number.isFinite(record.fitScore)
        || record.fitScore < 0 || record.fitScore > 100) {
        throw new TypeError(`records[${index}].fitScore must be between 0 and 100`);
      }
      normalized.fitScore = record.fitScore;
    }
    return normalized;
  });
}

function stageObservation(record) {
  const applied = Boolean(record.appliedAt);
  const responded = applied && Boolean(
    record.respondedAt
    || record.interviewAt
    || record.offerAt
    || record.hiredAt
    || ["responded", "interview", "offer", "hired"].includes(record.status),
  );
  const interviewed = applied && Boolean(
    record.interviewAt
    || record.offerAt
    || record.hiredAt
    || ["interview", "offer", "hired"].includes(record.status),
  );
  const offered = applied && Boolean(
    record.offerAt || record.hiredAt || ["offer", "hired"].includes(record.status),
  );
  const hired = applied && Boolean(record.hiredAt || record.status === "hired");
  const rejected = applied && Boolean(record.rejectedAt || record.status === "rejected");
  return {
    id: record.id,
    role: record.role,
    portal: record.sourcePortal ?? "unknown",
    resumeVariant: record.resumeVariant ?? "unknown",
    fitBand: fitBand(record.fitScore),
    applied,
    responded,
    interviewed,
    offered,
    hired,
    rejected,
  };
}

function funnelMetrics(observations) {
  const counts = {
    total: observations.length,
    applied: count(observations, "applied"),
    responded: count(observations, "responded"),
    interviewed: count(observations, "interviewed"),
    offered: count(observations, "offered"),
    hired: count(observations, "hired"),
    rejected: count(observations, "rejected"),
  };
  return {
    counts,
    rates: {
      responsePerApplied: rate(counts.responded, counts.applied),
      interviewPerApplied: rate(counts.interviewed, counts.applied),
      offerPerApplied: rate(counts.offered, counts.applied),
      hirePerApplied: rate(counts.hired, counts.applied),
      offerPerInterview: rate(counts.offered, counts.interviewed),
      hirePerOffer: rate(counts.hired, counts.offered),
    },
  };
}

function segmentMetrics(observations, group) {
  const buckets = new Map();
  for (const observation of observations) {
    const key = observation[group];
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(observation);
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en", { sensitivity: "base" }))
    .map(([value, items]) => {
      const metrics = funnelMetrics(items);
      return {
        value,
        ...metrics,
        comparisonEligible: metrics.counts.applied >= MIN_COMPARISON_SAMPLE,
        sampleStatus: metrics.counts.applied >= MIN_COMPARISON_SAMPLE
          ? "descriptive-comparison-allowed"
          : "insufficient-applied-sample",
      };
    });
}

function validateGroups(groups) {
  if (!Array.isArray(groups) || groups.length < 1 || groups.length > ANALYTICS_GROUPS.length) {
    throw new TypeError("groups must contain between 1 and 4 supported values");
  }
  const unique = [...new Set(groups)];
  const unsupported = unique.filter((group) => !ANALYTICS_GROUPS.includes(group));
  if (unsupported.length > 0) throw new Error(`Unsupported analytics group: ${unsupported[0]}`);
  return unique;
}

function fitBand(score) {
  if (score === undefined) return "unknown";
  if (score < 50) return "00-49";
  if (score < 70) return "50-69";
  if (score < 85) return "70-84";
  return "85-100";
}

function count(items, field) {
  return items.filter((item) => item[field]).length;
}

function rate(numerator, denominator) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 10_000) / 10_000;
}

function daysBetween(start, end) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

function median(values) {
  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? values[middle]
    : (values[middle - 1] + values[middle]) / 2;
}

function validDate(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be a valid ISO date (YYYY-MM-DD)`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} must be a valid ISO date (YYYY-MM-DD)`);
  }
  return value;
}

function requiredText(value, field, maximum) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > maximum) {
    throw new TypeError(`${field} must contain between 1 and ${maximum} characters`);
  }
  return value.trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
