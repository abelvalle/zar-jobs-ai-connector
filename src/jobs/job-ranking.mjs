const FACTOR_WEIGHTS = Object.freeze({
  title: 25,
  skills: 30,
  location: 15,
  workplace: 10,
  salary: 10,
  requiredTerms: 10,
});

const ARRAY_PREFERENCES = [
  "titleKeywords",
  "skillKeywords",
  "preferredLocations",
  "requiredTerms",
  "excludedTerms",
];

export function scoreJobFit(preferences, job) {
  const normalizedPreferences = normalizePreferences(preferences);
  const normalizedJob = normalizeJob(job);
  const searchableFields = buildSearchableFields(normalizedJob);

  const breakdown = {
    title: scoreTerms(
      normalizedPreferences.titleKeywords,
      searchableFields.title,
      FACTOR_WEIGHTS.title,
      "any",
    ),
    skills: scoreTerms(
      normalizedPreferences.skillKeywords,
      searchableFields.all,
      FACTOR_WEIGHTS.skills,
      "ratio",
    ),
    location: scoreTerms(
      normalizedPreferences.preferredLocations,
      searchableFields.location,
      FACTOR_WEIGHTS.location,
      "any",
    ),
    workplace: scoreWorkplace(normalizedPreferences.remotePreference, normalizedJob),
    salary: scoreSalary(normalizedPreferences.salaryMinimum, normalizedJob.salaryMinimum),
    requiredTerms: scoreTerms(
      normalizedPreferences.requiredTerms,
      searchableFields.all,
      FACTOR_WEIGHTS.requiredTerms,
      "ratio",
    ),
  };

  const factors = Object.values(breakdown).filter((factor) => factor.configured);
  const possible = factors.reduce((total, factor) => total + factor.weight, 0);
  const earned = factors.reduce((total, factor) => total + factor.score, 0);
  const blockers = findExcludedTerms(normalizedPreferences.excludedTerms, searchableFields);
  const uncappedScore = Math.round((earned / possible) * 100);
  const score = blockers.length > 0 ? Math.min(39, uncappedScore) : uncappedScore;
  const evidenced = factors.filter((factor) => factor.status !== "unknown").length;
  const confidence = Math.round((evidenced / factors.length) * 100);

  return {
    job: {
      id: normalizedJob.id,
      title: normalizedJob.title,
      company: normalizedJob.company,
      location: normalizedJob.location,
      workplaceType: normalizedJob.workplaceType,
      salaryMinimum: normalizedJob.salaryMinimum,
      url: normalizedJob.url,
    },
    score,
    uncappedScore,
    confidence,
    status: scoreStatus(score, blockers),
    breakdown,
    blockers,
    reviewQuestions: buildReviewQuestions(breakdown, blockers),
    method: "deterministic-weighted-rules-v1",
    decisionMade: false,
    humanReviewRequired: true,
    networkAccess: false,
    stored: false,
  };
}

export function compareJobFit(preferences, jobs) {
  if (!Array.isArray(jobs) || jobs.length < 1 || jobs.length > 20) {
    throw new Error("jobs must contain between 1 and 20 records.");
  }

  const ranking = jobs
    .map((job, index) => ({ ...scoreJobFit(preferences, job), inputIndex: index }))
    .sort((left, right) =>
      right.score - left.score
      || right.confidence - left.confidence
      || left.job.company.localeCompare(right.job.company, "en", { sensitivity: "base" })
      || left.job.title.localeCompare(right.job.title, "en", { sensitivity: "base" })
      || left.inputIndex - right.inputIndex)
    .map((result, index) => ({
      rank: index + 1,
      id: result.job.id,
      title: result.job.title,
      company: result.job.company,
      score: result.score,
      confidence: result.confidence,
      status: result.status,
      blockers: result.blockers,
      breakdown: result.breakdown,
      reviewQuestions: result.reviewQuestions,
    }));

  return {
    ranking,
    comparedJobs: ranking.length,
    method: "deterministic-weighted-rules-v1",
    decisionMade: false,
    humanReviewRequired: true,
    networkAccess: false,
    stored: false,
  };
}

function normalizePreferences(preferences) {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
    throw new Error("preferences must be an object.");
  }

  const normalized = {};
  for (const key of ARRAY_PREFERENCES) {
    const value = preferences[key] ?? [];
    if (!Array.isArray(value) || value.length > 50) {
      throw new Error(`${key} must be an array with at most 50 terms.`);
    }
    normalized[key] = [...new Set(value.map((term) => normalizeRequiredTerm(term, key)))];
  }

  normalized.remotePreference = preferences.remotePreference ?? "any";
  if (!["any", "remote", "hybrid", "onsite"].includes(normalized.remotePreference)) {
    throw new Error("remotePreference must be any, remote, hybrid, or onsite.");
  }

  normalized.salaryMinimum = preferences.salaryMinimum ?? null;
  if (normalized.salaryMinimum !== null
      && (!Number.isFinite(normalized.salaryMinimum) || normalized.salaryMinimum < 0)) {
    throw new Error("salaryMinimum must be a non-negative number.");
  }

  const hasScoredPreference = normalized.titleKeywords.length > 0
    || normalized.skillKeywords.length > 0
    || normalized.preferredLocations.length > 0
    || normalized.remotePreference !== "any"
    || normalized.salaryMinimum !== null
    || normalized.requiredTerms.length > 0;
  if (!hasScoredPreference) {
    throw new Error("Provide at least one preference used for ranking.");
  }

  return normalized;
}

function normalizeJob(job) {
  if (!job || typeof job !== "object" || Array.isArray(job)) {
    throw new Error("job must be an object.");
  }
  const title = requiredText(job.title, "job.title", 200);
  const company = requiredText(job.company, "job.company", 200);
  const salaryMinimum = job.salaryMinimum ?? null;
  if (salaryMinimum !== null
      && (!Number.isFinite(salaryMinimum) || salaryMinimum < 0)) {
    throw new Error("job.salaryMinimum must be a non-negative number.");
  }

  return {
    id: optionalText(job.id, "job.id", 200),
    title,
    company,
    location: optionalText(job.location, "job.location", 300),
    workplaceType: optionalText(job.workplaceType, "job.workplaceType", 100),
    salaryMinimum,
    description: optionalText(job.description, "job.description", 100_000),
    url: optionalText(job.url, "job.url", 2048),
  };
}

function scoreTerms(terms, haystack, weight, mode) {
  if (terms.length === 0) {
    return emptyFactor(weight);
  }
  if (!haystack) {
    return {
      configured: true,
      weight,
      score: 0,
      status: "unknown",
      matched: [],
      missing: terms,
    };
  }

  const matched = terms.filter((term) => hasTerm(haystack, term));
  const missing = terms.filter((term) => !matched.includes(term));
  const ratio = mode === "any" ? Number(matched.length > 0) : matched.length / terms.length;
  return {
    configured: true,
    weight,
    score: Math.round(weight * ratio),
    status: matched.length === terms.length
      ? "matched"
      : matched.length > 0
        ? "partial"
        : "missing",
    matched,
    missing,
  };
}

function scoreWorkplace(preference, job) {
  if (preference === "any") {
    return emptyFactor(FACTOR_WEIGHTS.workplace);
  }
  if (!job.workplaceType) {
    return {
      configured: true,
      weight: FACTOR_WEIGHTS.workplace,
      score: 0,
      status: "unknown",
      preference,
      observed: null,
    };
  }
  const observed = normalizeWorkplace(job.workplaceType);
  const matched = observed === preference;
  return {
    configured: true,
    weight: FACTOR_WEIGHTS.workplace,
    score: matched ? FACTOR_WEIGHTS.workplace : 0,
    status: matched ? "matched" : "missing",
    preference,
    observed,
  };
}

function scoreSalary(preference, observed) {
  if (preference === null) {
    return emptyFactor(FACTOR_WEIGHTS.salary);
  }
  if (observed === null) {
    return {
      configured: true,
      weight: FACTOR_WEIGHTS.salary,
      score: 0,
      status: "unknown",
      preference,
      observed: null,
    };
  }
  const matched = observed >= preference;
  return {
    configured: true,
    weight: FACTOR_WEIGHTS.salary,
    score: matched ? FACTOR_WEIGHTS.salary : 0,
    status: matched ? "matched" : "missing",
    preference,
    observed,
  };
}

function findExcludedTerms(terms, fields) {
  return terms.flatMap((term) => {
    const field = ["title", "company", "location", "workplaceType", "description"]
      .find((candidate) => hasTerm(fields[candidate], term));
    return field ? [{ type: "excluded-term", term, field }] : [];
  });
}

function buildReviewQuestions(breakdown, blockers) {
  const questions = [];
  if (breakdown.location.status === "unknown") questions.push("Confirm the job location.");
  if (breakdown.workplace.status === "unknown") questions.push("Confirm the workplace arrangement.");
  if (breakdown.salary.status === "unknown") questions.push("Confirm the advertised minimum salary.");
  if (breakdown.requiredTerms.status === "unknown") questions.push("Confirm the required job terms from the original posting.");
  if (blockers.length > 0) questions.push("Review every excluded-term blocker against the original posting.");
  return questions;
}

function buildSearchableFields(job) {
  const fields = {
    title: normalizeText(job.title),
    company: normalizeText(job.company),
    location: normalizeText(job.location),
    workplaceType: normalizeText(job.workplaceType),
    description: normalizeText(job.description),
  };
  return {
    ...fields,
    all: Object.values(fields).filter(Boolean).join(" "),
  };
}

function normalizeWorkplace(value) {
  const text = normalizeText(value);
  if (hasTerm(text, "remote") || hasTerm(text, "remoto") || hasTerm(text, "teletrabajo")) {
    return "remote";
  }
  if (hasTerm(text, "hybrid") || hasTerm(text, "hibrido")) return "hybrid";
  if (hasTerm(text, "onsite") || hasTerm(text, "on site") || hasTerm(text, "presencial")) {
    return "onsite";
  }
  return "unknown";
}

function emptyFactor(weight) {
  return { configured: false, weight, score: 0, status: "not-configured" };
}

function scoreStatus(score, blockers) {
  if (blockers.length > 0) return "blocked-by-preference";
  if (score >= 75) return "review-recommended";
  if (score >= 50) return "possible-fit";
  return "low-fit";
}

function normalizeRequiredTerm(value, key) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > 100) {
    throw new Error(`${key} terms must contain between 1 and 100 characters.`);
  }
  return normalizeText(value);
}

function requiredText(value, field, maxLength) {
  const text = optionalText(value, field, maxLength);
  if (!text) throw new Error(`${field} is required.`);
  return text;
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length < 1 || value.length > maxLength) {
    throw new Error(`${field} must contain between 1 and ${maxLength} characters.`);
  }
  return value.trim();
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function hasTerm(haystack, term) {
  if (!haystack || !term) return false;
  return ` ${haystack} `.includes(` ${term} `);
}
