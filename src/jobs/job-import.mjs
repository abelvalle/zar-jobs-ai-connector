import { createHash } from "node:crypto";

import { normalizeJobUrl } from "../portals/url-normalizer.mjs";

const MAX_SOURCE_CHARACTERS = 200_000;
const MAX_JOBS = 200;
const REVIEW_FIELDS = [
  "title",
  "company",
  "location",
  "publishedAt",
  "workplaceType",
  "employmentType",
  "salary",
  "description",
];

export function reviewJobImport(sourceText, job, sourceLabel = "manual") {
  if (typeof sourceText !== "string" || sourceText.trim().length === 0) {
    throw new TypeError("sourceText is required");
  }
  if (sourceText.length > MAX_SOURCE_CHARACTERS) {
    throw new TypeError("sourceText exceeds the 200,000 character limit");
  }
  if (!isPlainObject(job)) throw new TypeError("job must be an object");
  if (typeof sourceLabel !== "string" || sourceLabel.trim().length === 0 || sourceLabel.length > 100) {
    throw new TypeError("sourceLabel must contain between 1 and 100 characters");
  }

  const normalizedUrl = job.url === undefined ? null : normalizeJobUrl(job.url);
  const fields = REVIEW_FIELDS
    .filter((field) => hasText(job[field]))
    .map((field) => ({
      field,
      value: job[field].trim(),
      support: classifySupport(sourceText, job[field]),
      confirmed: false,
    }));
  const validationErrors = [];
  for (const required of ["title", "company"]) {
    if (!hasText(job[required])) validationErrors.push({ field: required, message: "is required" });
  }

  return {
    status: "confirmation-required",
    sourceLabel: sourceLabel.trim(),
    job: {
      title: textOrNull(job.title),
      company: textOrNull(job.company),
      location: textOrNull(job.location),
      url: normalizedUrl?.url ?? null,
      portal: normalizedUrl?.portal ?? "unknown",
      externalId: textOrNull(job.externalId) ?? normalizedUrl?.externalId ?? null,
      publishedAt: textOrNull(job.publishedAt),
      workplaceType: textOrNull(job.workplaceType),
      employmentType: textOrNull(job.employmentType),
      salary: textOrNull(job.salary),
      description: textOrNull(job.description),
    },
    fields,
    urlEvidence: normalizedUrl ? "user-provided-url" : null,
    validationErrors,
    verificationStatus: "unverified",
    humanReviewRequired: true,
    networkAccess: false,
    stored: false,
    safeNextAction:
      "Confirm every field against the original posting before using it for a resume or application.",
  };
}

export function fingerprintJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0 || jobs.length > MAX_JOBS) {
    throw new TypeError(`jobs must contain between 1 and ${MAX_JOBS} items`);
  }

  const items = jobs.map((job, index) => fingerprintJob(job, index));
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.fingerprint)) groups.set(item.fingerprint, []);
    groups.get(item.fingerprint).push(item.inputIndex);
  }
  const duplicateGroups = [...groups.entries()]
    .filter(([, inputIndexes]) => inputIndexes.length > 1)
    .map(([fingerprint, inputIndexes]) => ({ fingerprint, inputIndexes }));

  return {
    algorithm: "zar-jobs-exact-v1",
    items,
    duplicateGroups,
    duplicateCount: duplicateGroups.reduce((total, group) => total + group.inputIndexes.length - 1, 0),
    fuzzyMatching: false,
    stored: false,
    disclaimer:
      "Only deterministic exact keys are grouped. Similar roles with different keys require human review.",
  };
}

function fingerprintJob(job, index) {
  if (!isPlainObject(job)) throw new TypeError(`jobs[${index}] must be an object`);
  const normalizedUrl = job.url === undefined ? null : normalizeJobUrl(job.url);
  const externalId = textOrNull(job.externalId) ?? normalizedUrl?.externalId;
  const portal = textOrNull(job.source) ?? normalizedUrl?.portal ?? "unknown";
  let keyType;
  let key;

  if (externalId) {
    keyType = "source-external-id";
    key = `${normalize(portal)}|${normalize(externalId)}`;
  } else if (normalizedUrl) {
    keyType = "normalized-url";
    key = normalizedUrl.url;
  } else {
    if (!hasText(job.title) || !hasText(job.company)) {
      throw new TypeError(`jobs[${index}] requires title and company when URL or externalId is absent`);
    }
    keyType = "identity-fields";
    key = [job.company, job.title, job.location ?? ""].map(normalize).join("|");
  }

  return {
    inputIndex: index,
    inputId: textOrNull(job.id),
    fingerprint: createHash("sha256").update(`zar-jobs-exact-v1|${keyType}|${key}`).digest("hex"),
    keyType,
  };
}

function classifySupport(sourceText, value) {
  const source = normalize(sourceText);
  const candidate = normalize(value);
  if (source.includes(candidate)) return "exact";
  const tokens = unique(candidate.split(/[^a-z0-9#+.]+/).filter((token) => token.length >= 3));
  if (tokens.length === 0) return "unmatched";
  const matched = tokens.filter((token) => source.includes(token)).length;
  return matched >= 2 && matched / tokens.length >= 0.6 ? "partial" : "unmatched";
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values)];
}

function textOrNull(value) {
  return hasText(value) ? value.trim() : null;
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
