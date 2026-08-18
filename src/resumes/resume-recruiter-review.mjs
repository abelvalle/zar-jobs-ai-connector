import { buildEvidenceBank } from "./resume-interoperability.mjs";
import { analyzeResumeJobMatch, validateResume } from "./resume-tools.mjs";

const MAX_JOB_DESCRIPTION = 100_000;
const MAX_TARGET_ROLE = 200;
const LONG_HIGHLIGHT = 240;
const MAX_HIGHLIGHTS_PER_ROLE = 6;

export const RECRUITER_REVIEW_DIMENSIONS = Object.freeze([
  "clarity",
  "relevance",
  "impact",
  "credibility",
  "scanability",
  "evidence",
]);

export function reviewResumeAsRecruiter(resume, options = {}) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
  }
  const normalizedOptions = validateOptions(options);
  const evidenceBank = buildEvidenceBank(resume);
  const work = resume.work ?? [];
  const projects = resume.projects ?? [];
  const skills = resume.skills ?? [];
  const highlights = collectHighlights(work, projects);
  const quantifiedHighlights = highlights.filter((item) => containsMetric(item.text));
  const longHighlights = highlights.filter((item) => item.text.length > LONG_HIGHLIGHT);
  const crowdedRoles = work
    .map((item, index) => ({ index, count: item.highlights?.length ?? 0 }))
    .filter((item) => item.count > MAX_HIGHLIGHTS_PER_ROLE);
  const incompleteWorkIdentity = work
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !hasText(item.name) || !hasText(item.position));
  const missingWorkDates = work
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !hasText(item.startDate));
  const summary = resume.basics?.summary?.trim() ?? "";
  const headlinePresent = hasText(resume.basics?.label);
  const targetMatch = normalizedOptions.jobDescription
    ? analyzeResumeJobMatch(resume, normalizedOptions.jobDescription)
    : null;

  const context = {
    resume,
    evidenceBank,
    work,
    projects,
    skills,
    highlights,
    quantifiedHighlights,
    longHighlights,
    crowdedRoles,
    incompleteWorkIdentity,
    missingWorkDates,
    summary,
    headlinePresent,
    targetMatch,
  };
  const rubric = scoreRubric(context);
  const priorities = buildPriorities(context);

  return {
    mode: targetMatch ? "targeted" : "general",
    targetRole: normalizedOptions.targetRole ?? null,
    firstPass: {
      headlinePresent,
      summaryPresent: summary.length > 0,
      summaryCharacters: summary.length,
      roles: work.length,
      highlights: highlights.length,
      quantifiedHighlights: quantifiedHighlights.length,
      evidenceItems: evidenceBank.items.length,
    },
    rubric,
    overallScore: Math.round(
      (rubric.reduce((sum, item) => sum + item.score, 0) / (rubric.length * 5)) * 100,
    ),
    strengths: buildStrengths(context),
    priorities,
    questions: priorities
      .filter((item) => item.evidenceQuestion)
      .map((item) => ({ code: item.code, question: item.evidenceQuestion })),
    targetMatch,
    validation,
    method: "deterministic-recruiter-style-rubric-v1",
    recruiterStyleSimulation: true,
    professionalRecruiterReviewPerformed: false,
    hiringProbabilityCalculated: false,
    hiringDecisionMade: false,
    protectedTraitsUsed: false,
    factsAdded: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "This is a deterministic recruiter-style review aid, not a review by a human recruiter, a hiring prediction, or proof of ATS performance.",
  };
}

function scoreRubric(context) {
  const {
    evidenceBank,
    work,
    projects,
    skills,
    highlights,
    quantifiedHighlights,
    longHighlights,
    crowdedRoles,
    incompleteWorkIdentity,
    missingWorkDates,
    summary,
    headlinePresent,
    targetMatch,
  } = context;
  const identityRatio = ratio(work.length - incompleteWorkIdentity.length, work.length);
  const datedRatio = ratio(work.length - missingWorkDates.length, work.length);
  const highlightedRoles = work.filter((item) => (item.highlights?.length ?? 0) > 0).length;
  const highlightRatio = ratio(highlightedRoles, work.length);
  const metricRatio = ratio(quantifiedHighlights.length, highlights.length);
  const sectionBreadth = [work, projects, skills, context.resume.education ?? []]
    .filter((items) => items.length > 0).length;
  const scanPenalty = Math.min(2, longHighlights.length * 0.5)
    + Math.min(1, crowdedRoles.length * 0.5)
    + (summary.length > 600 ? 1 : 0);
  const relevance = targetMatch
    ? targetMatch.score / 20
    : (headlinePresent ? 1.5 : 0) + (summary.length > 0 ? 1.5 : 0) + (skills.length > 0 ? 2 : 0);

  return [
    dimension("clarity", (headlinePresent ? 1.5 : 0)
      + (summary.length >= 80 && summary.length <= 600 ? 1.5 : summary.length > 0 ? 0.75 : 0)
      + identityRatio
      + highlightRatio, ["basics.label", "basics.summary", "work"]),
    dimension("relevance", relevance, targetMatch
      ? ["basics.label", "basics.summary", "skills", "work", "projects"]
      : ["basics.label", "basics.summary", "skills"]),
    dimension("impact", highlights.length === 0 ? 0 : 1 + (metricRatio * 3)
      + (quantifiedHighlights.length >= 2 ? 1 : quantifiedHighlights.length === 1 ? 0.5 : 0),
    quantifiedHighlights.map((item) => item.path)),
    dimension("credibility", 2 + (datedRatio * 2) + (evidenceBank.items.length > 0 ? 1 : 0),
      ["work", "education", "projects", "skills"]),
    dimension("scanability", 5 - scanPenalty,
      [...longHighlights.map((item) => item.path), ...crowdedRoles.map((item) => `work[${item.index}].highlights`)]),
    dimension("evidence", (highlightRatio * 2) + (metricRatio > 0 ? 1 : 0)
      + (skills.length > 0 ? 1 : 0) + (sectionBreadth >= 3 ? 1 : sectionBreadth / 3),
    evidenceBank.items.slice(0, 10).map((item) => item.sourcePath)),
  ];
}

function buildPriorities(context) {
  const priorities = [];
  if (!context.headlinePresent) {
    priorities.push(priority("critical", "missing-headline", ["basics.label"],
      "The resume has no explicit professional headline.",
      "Add a concise role label using only a title the candidate confirms."));
  }
  if (context.summary.length === 0) {
    priorities.push(priority("critical", "missing-summary", ["basics.summary"],
      "The first-pass summary is absent.",
      "Draft a short positioning summary from confirmed evidence only."));
  } else if (context.summary.length < 80 || context.summary.length > 600) {
    priorities.push(priority("important", "summary-length", ["basics.summary"],
      `The summary contains ${context.summary.length} characters; the review range is 80 to 600.`,
      "Tighten or expand the summary without adding unsupported claims."));
  }
  for (const { index } of context.incompleteWorkIdentity) {
    priorities.push(priority("critical", "incomplete-role-identity", [`work[${index}]`],
      "A work entry is missing its employer or role title.",
      "Confirm the missing identity field before sharing the resume."));
  }
  for (const { index } of context.missingWorkDates) {
    priorities.push(priority("important", "missing-role-start-date", [`work[${index}].startDate`],
      "A work entry has no start date.",
      "Confirm the date; do not estimate it."));
  }
  if (context.highlights.length === 0) {
    priorities.push(priority("critical", "missing-achievement-evidence", ["work", "projects"],
      "No work or project highlights are available for a recruiter-style evidence scan.",
      "Add confirmed responsibilities or outcomes as concise highlights.",
      "Which responsibilities or outcomes can you confirm for your most relevant role?"));
  } else if (context.quantifiedHighlights.length === 0) {
    priorities.push(priority("important", "no-quantified-outcomes",
      context.highlights.map((item) => item.path),
      "No highlight contains a measurable outcome.",
      "Keep the current facts and add a metric only if the candidate can substantiate it.",
      "Can you confirm any scale, time, quality, revenue, cost, adoption, or reliability result for these achievements?"));
  }
  if (context.skills.length === 0) {
    priorities.push(priority("important", "missing-skills-section", ["skills"],
      "No structured skills section is available.",
      "Add only skills supported by the confirmed resume or the user."));
  }
  for (const item of context.longHighlights) {
    priorities.push(priority("optional", "long-highlight", [item.path],
      `A highlight contains ${item.text.length} characters and may slow a first-pass scan.`,
      "Shorten it while preserving the same confirmed claim."));
  }
  for (const item of context.crowdedRoles) {
    priorities.push(priority("optional", "crowded-role", [`work[${item.index}].highlights`],
      `A role contains ${item.count} highlights; the review threshold is ${MAX_HIGHLIGHTS_PER_ROLE}.`,
      "Prioritize the most relevant confirmed evidence for the target role."));
  }
  if (context.targetMatch?.missingKeywords.length > 0) {
    priorities.push({
      ...priority("important", "unsupported-target-terms", [],
        `${context.targetMatch.missingKeywords.length} prominent target terms are not present in the resume evidence.`,
        "Treat them as evidence gaps; never add them solely to improve the match score.",
        "Which of these target terms can you support with a real example?"),
      unsupportedTerms: context.targetMatch.missingKeywords,
    });
  }
  return priorities;
}

function buildStrengths(context) {
  const strengths = [];
  if (context.headlinePresent) strengths.push(strength("clear-headline", ["basics.label"]));
  if (context.summary.length >= 80 && context.summary.length <= 600) {
    strengths.push(strength("scannable-summary", ["basics.summary"]));
  }
  if (context.quantifiedHighlights.length > 0) {
    strengths.push(strength("quantified-evidence", context.quantifiedHighlights.map((item) => item.path)));
  }
  if (context.targetMatch?.matchedKeywords.length > 0) {
    strengths.push({
      ...strength("supported-target-overlap", ["basics", "work", "projects", "skills"]),
      supportedTerms: context.targetMatch.matchedKeywords,
    });
  }
  if (context.evidenceBank.items.length >= 5) {
    strengths.push(strength("evidence-breadth", context.evidenceBank.items.slice(0, 10).map((item) => item.sourcePath)));
  }
  return strengths;
}

function validateOptions(options) {
  if (!isPlainObject(options)) throw new TypeError("options must be an object");
  const allowed = new Set(["jobDescription", "targetRole"]);
  const unsupported = Object.keys(options).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported recruiter review option: ${unsupported}`);
  const normalized = {};
  if (options.jobDescription !== undefined) {
    normalized.jobDescription = boundedText(options.jobDescription, "jobDescription", MAX_JOB_DESCRIPTION);
  }
  if (options.targetRole !== undefined) {
    normalized.targetRole = boundedText(options.targetRole, "targetRole", MAX_TARGET_ROLE);
  }
  return normalized;
}

function collectHighlights(work, projects) {
  return [
    ...work.flatMap((item, index) => (item.highlights ?? []).map((text, highlightIndex) => ({
      path: `work[${index}].highlights[${highlightIndex}]`,
      text,
    }))),
    ...projects.flatMap((item, index) => (item.highlights ?? []).map((text, highlightIndex) => ({
      path: `projects[${index}].highlights[${highlightIndex}]`,
      text,
    }))),
  ].filter((item) => hasText(item.text));
}

function dimension(name, score, evidencePaths) {
  return { name, score: Math.round(clamp(score, 0, 5) * 10) / 10, maximum: 5, evidencePaths: unique(evidencePaths) };
}

function priority(level, code, paths, observation, safeAction, evidenceQuestion = null) {
  return { level, code, paths: unique(paths), observation, safeAction, evidenceQuestion };
}

function strength(code, paths) {
  return { code, paths: unique(paths) };
}

function containsMetric(value) {
  return /(?:\b\d+(?:[.,]\d+)?\s?(?:%|x|k|m|ms|s|h|d|€|\$|£)\b)|(?:[$€£]\s?\d)|(?:\b\d{2,}\b)/iu.test(value);
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function boundedText(value, field, maximum) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${field} must contain between 1 and ${maximum} characters`);
  }
  return value.trim();
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
