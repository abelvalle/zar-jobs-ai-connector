import { validateResume } from "./resume-tools.mjs";

const DEFAULT_MAX_QUESTIONS = 10;
const MAX_QUESTIONS = 20;
const MAX_TEXT = 5_000;
const METRIC_PATTERN = /(?:[$€£]\s?\d[\d.,]*|\b\d+(?:[.,]\d+)?\s?(?:%|x|k|m|ms|s|h|d)(?!\p{L})|\b\d{2,}\b)/giu;
const OUTCOME_TERMS = new Set([
  "achieved", "aumente", "aumento", "delivered", "entregue", "improved", "mejore",
  "optimized", "optimice", "reduced", "reduje", "saved", "ahorre", "grew", "crecio",
  "increased", "incremented", "launched", "lance", "accelerated", "acelere",
]);
const ACTION_TERMS = new Set([
  "built", "construi", "created", "cree", "designed", "disene", "developed", "desarrolle",
  "implemented", "implemente", "led", "lidere", "managed", "gestione", "migrated", "migre",
  "owned", "dirigi", "automated", "automatice", "coordinated", "coordine", "resolved", "resolvi",
  "reduced", "reduje", "improved", "mejore", "increased", "aumente", "delivered", "entregue",
]);
const REVIEW_STOPWORDS = new Set([
  "about", "after", "also", "and", "before", "between", "con", "como", "del", "desde", "during",
  "for", "from", "into", "las", "los", "para", "por", "that", "the", "their", "through", "using",
  "with", "y", "using", "team", "equipo", "project", "proyecto", "system", "sistema",
]);

export const ACHIEVEMENT_SIGNAL_TYPES = Object.freeze(["action", "scope", "outcome"]);

export function planAchievementInterview(resume, options = {}) {
  assertValidResume(resume);
  const normalized = validateOptions(options);
  const candidates = collectCandidates(resume);
  const items = candidates.map(reviewCandidate).sort(compareCandidates);
  const questions = items
    .flatMap((item) => item.questions)
    .slice(0, normalized.maxQuestions);

  return {
    targetRole: normalized.targetRole ?? null,
    summary: {
      reviewedEntries: items.length,
      entriesNeedingEvidence: items.filter((item) => item.missingSignals.length > 0).length,
      entriesWithMetrics: items.filter((item) => item.signals.scope).length,
      entriesWithOutcomes: items.filter((item) => item.signals.outcome).length,
      questionsReturned: questions.length,
    },
    items,
    questions,
    nextStep:
      "Ask the candidate these questions, record only answers they explicitly confirm, then draft and audit one achievement at a time.",
    method: "deterministic-achievement-evidence-interview-v1",
    generatedAchievements: false,
    metricsInvented: false,
    factsAdded: false,
    baseResumeModified: false,
    humanReviewRequired: true,
    stored: false,
  };
}

export function auditAchievementRewrite(input) {
  if (!isPlainObject(input)) throw new TypeError("input must be an object");
  const allowed = new Set(["sourcePath", "sourceText", "confirmedEvidence", "proposedText"]);
  const unsupportedField = Object.keys(input).find((key) => !allowed.has(key));
  if (unsupportedField) throw new Error(`Unsupported achievement audit field: ${unsupportedField}`);

  const sourcePath = boundedText(input.sourcePath, "sourcePath", 300);
  const sourceText = boundedText(input.sourceText, "sourceText", MAX_TEXT);
  const proposedText = boundedText(input.proposedText, "proposedText", MAX_TEXT);
  if (!Array.isArray(input.confirmedEvidence) || input.confirmedEvidence.length === 0
      || input.confirmedEvidence.length > 20) {
    throw new TypeError("confirmedEvidence must contain between 1 and 20 candidate-confirmed statements");
  }
  const confirmedEvidence = input.confirmedEvidence.map((value, index) => (
    boundedText(value, `confirmedEvidence[${index}]`, MAX_TEXT)
  ));
  const evidenceText = [sourceText, ...confirmedEvidence].join(" ");
  const evidenceMetrics = unique(extractMetrics(evidenceText));
  const proposedMetrics = unique(extractMetrics(proposedText));
  const unsupportedMetrics = proposedMetrics.filter((metric) => !evidenceMetrics.includes(metric));
  const newTermsForReview = significantTerms(proposedText)
    .filter((term) => !significantTerms(evidenceText).includes(term))
    .slice(0, 20);

  return {
    sourcePath,
    status: unsupportedMetrics.length > 0 ? "review-required" : "human-confirmation-required",
    confirmedEvidenceCount: confirmedEvidence.length,
    proposedMetrics,
    evidenceMetrics,
    unsupportedMetrics,
    newTermsForReview,
    checks: {
      everyProposedMetricSupported: unsupportedMetrics.length === 0,
      candidateConfirmationStillRequired: true,
    },
    safeNextAction: unsupportedMetrics.length > 0
      ? "Remove or confirm every unsupported metric before applying the rewrite."
      : "Review every new term with the candidate, then apply the wording only as a user-confirmed resume change.",
    truthVerified: false,
    rewriteApproved: false,
    factsAdded: false,
    baseResumeModified: false,
    humanReviewRequired: true,
    stored: false,
  };
}

function collectCandidates(resume) {
  const candidates = [];
  for (const [workIndex, work] of (resume.work ?? []).entries()) {
    for (const [highlightIndex, text] of (work.highlights ?? []).entries()) {
      if (hasText(text)) candidates.push({
        kind: "work-highlight",
        sourcePath: `work[${workIndex}].highlights[${highlightIndex}]`,
        text: text.trim(),
        context: [work.position, work.name].filter(hasText).join(" at "),
      });
    }
    if ((work.highlights ?? []).filter(hasText).length === 0) candidates.push({
      kind: "work-entry",
      sourcePath: `work[${workIndex}]`,
      text: work.summary?.trim() ?? "",
      context: [work.position, work.name].filter(hasText).join(" at "),
    });
  }
  for (const [projectIndex, project] of (resume.projects ?? []).entries()) {
    for (const [highlightIndex, text] of (project.highlights ?? []).entries()) {
      if (hasText(text)) candidates.push({
        kind: "project-highlight",
        sourcePath: `projects[${projectIndex}].highlights[${highlightIndex}]`,
        text: text.trim(),
        context: project.name,
      });
    }
  }
  return candidates;
}

function reviewCandidate(candidate) {
  const normalized = normalize(candidate.text);
  const tokens = new Set(normalized.split(" ").filter(Boolean));
  const signals = {
    action: [...ACTION_TERMS].some((term) => tokens.has(term)),
    scope: extractMetrics(candidate.text).length > 0,
    outcome: [...OUTCOME_TERMS].some((term) => tokens.has(term)),
  };
  const missingSignals = ACHIEVEMENT_SIGNAL_TYPES.filter((signal) => !signals[signal]);
  const questions = [];
  if (!signals.action) questions.push(question(candidate, "action",
    "What did you personally do, and which part did you own?"));
  if (!signals.scope) questions.push(question(candidate, "scope",
    "What scale can you confirm: users, volume, team size, time, cost, reliability, or frequency?"));
  if (!signals.outcome) questions.push(question(candidate, "outcome",
    "What changed because of this work, and how was that result observed?"));
  return {
    sourcePath: candidate.sourcePath,
    kind: candidate.kind,
    context: candidate.context || null,
    currentText: candidate.text || null,
    signals,
    missingSignals,
    priority: missingSignals.length >= 2 ? "high" : missingSignals.length === 1 ? "medium" : "ready",
    questions,
  };
}

function question(candidate, category, prompt) {
  return { sourcePath: candidate.sourcePath, category, prompt, candidateConfirmationRequired: true };
}

function compareCandidates(left, right) {
  const weight = { high: 0, medium: 1, ready: 2 };
  return weight[left.priority] - weight[right.priority]
    || left.sourcePath.localeCompare(right.sourcePath);
}

function validateOptions(options) {
  if (!isPlainObject(options)) throw new TypeError("options must be an object");
  const allowed = new Set(["targetRole", "maxQuestions"]);
  const unsupported = Object.keys(options).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported achievement interview option: ${unsupported}`);
  const maxQuestions = options.maxQuestions ?? DEFAULT_MAX_QUESTIONS;
  if (!Number.isInteger(maxQuestions) || maxQuestions < 1 || maxQuestions > MAX_QUESTIONS) {
    throw new RangeError(`maxQuestions must be an integer between 1 and ${MAX_QUESTIONS}`);
  }
  return {
    targetRole: options.targetRole === undefined
      ? undefined
      : boundedText(options.targetRole, "targetRole", 200),
    maxQuestions,
  };
}

function assertValidResume(resume) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
  }
}

function extractMetrics(value) {
  return normalizeMetricMatches(value.match(METRIC_PATTERN) ?? []);
}

function normalizeMetricMatches(values) {
  return values.map((value) => value.toLocaleLowerCase("en-US").replace(/\s+/g, "").replace(/,/g, "."));
}

function significantTerms(value) {
  return unique(normalize(value).split(" ")
    .filter((term) => term.length >= 5 && !REVIEW_STOPWORDS.has(term) && !/^\d/.test(term)));
}

function boundedText(value, field, maximum) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${field} must contain between 1 and ${maximum} characters`);
  }
  return value.trim();
}

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}+#.]+/gu, " ").trim();
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values) {
  return [...new Set(values)];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
