import { buildEvidenceBank } from "../resumes/resume-interoperability.mjs";
import { validateResume } from "../resumes/resume-tools.mjs";

const MAX_TEXT = 10_000;
const MAX_EXPERIENCES = 30;
const METRIC_PATTERN = /(?:[$€£]\s*)?\d+(?:[.,]\d+)?\s*%?/g;
const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "como", "con", "del", "desde", "for", "from",
  "into", "las", "los", "para", "por", "que", "the", "their", "this", "through", "una",
  "using", "with", "your",
]);

export const LINKEDIN_PROFILE_FIELDS = Object.freeze(["headline", "about", "experience"]);

export function planLinkedInProfile(resume, options = {}) {
  assertValidResume(resume);
  const normalized = validateOptions(options);
  const evidenceBank = buildEvidenceBank(resume);
  const work = resume.work ?? [];
  const skillPaths = evidenceBank.items.filter((item) => item.category === "skill")
    .map((item) => item.sourcePath);
  const proofPaths = evidenceBank.items.filter((item) => (
    ["work-highlight", "project-highlight", "work-summary", "project-summary"].includes(item.category)
  )).map((item) => item.sourcePath);

  return {
    targetRole: normalized.targetRole ?? null,
    fields: {
      headline: {
        objective: "State the confirmed professional positioning and strongest supported specialisms.",
        evidencePaths: unique(["basics.label", ...skillPaths]).slice(0, 8),
        reviewBudgetCharacters: 220,
      },
      about: {
        objective: "Combine positioning, two or three evidence-backed outcomes, supported expertise, and a neutral closing.",
        evidencePaths: unique(["basics.summary", ...proofPaths, ...skillPaths]).slice(0, 15),
        reviewBudgetCharacters: 2_600,
      },
      experience: work.map((item, index) => ({
        sourcePath: `work[${index}]`,
        role: item.position ?? null,
        company: item.name ?? null,
        objective: "Describe responsibilities and outcomes already confirmed for this role.",
        evidencePaths: evidenceBank.items.filter((evidence) => (
          evidence.sourcePath === `work[${index}]`
          || evidence.sourcePath.startsWith(`work[${index}].`)
        )).map((evidence) => evidence.sourcePath),
      })),
    },
    workflow: [
      "Draft each field only from its evidence paths.",
      "Audit the complete draft before the user copies it manually.",
      "Keep unsupported terms as questions and never add unconfirmed metrics.",
    ],
    method: "evidence-backed-linkedin-profile-plan-v1",
    generatedText: false,
    linkedinProfileRead: false,
    linkedinProfileModified: false,
    networkAccess: false,
    factsAdded: false,
    humanReviewRequired: true,
    stored: false,
  };
}

export function auditLinkedInProfileDraft(resume, profile) {
  assertValidResume(resume);
  const draft = validateProfile(profile);
  const evidenceBank = buildEvidenceBank(resume);
  const resumeCorpus = evidenceBank.items.map((item) => item.text).join(" ");
  const fields = [
    auditField("headline", "headline", draft.headline, evidenceBank, resumeCorpus),
    ...(draft.about ? [auditField("about", "about", draft.about, evidenceBank, resumeCorpus)] : []),
    ...draft.experience.map((item, index) => (
      auditField("experience", item.sourcePath, item.text, evidenceBank, resumeCorpus, index)
    )),
  ];
  const unsupportedMetrics = unique(fields.flatMap((field) => field.unsupportedMetrics));
  const fieldsWithReviewTerms = fields.filter((field) => field.newTermsForReview.length > 0).length;

  return {
    status: unsupportedMetrics.length > 0 ? "review-required" : "human-confirmation-required",
    fields,
    summary: {
      fieldsReviewed: fields.length,
      fieldsWithUnsupportedMetrics: fields.filter((field) => field.unsupportedMetrics.length > 0).length,
      fieldsWithReviewTerms,
    },
    unsupportedMetrics,
    safeNextAction: unsupportedMetrics.length > 0
      ? "Remove or confirm unsupported metrics before copying any draft to LinkedIn."
      : "Review every new term and copy approved text manually only after candidate confirmation.",
    truthVerified: false,
    profileApproved: false,
    protectedTraitsUsed: false,
    linkedinProfileRead: false,
    linkedinProfileModified: false,
    networkAccess: false,
    factsAdded: false,
    humanReviewRequired: true,
    stored: false,
  };
}

function auditField(kind, sourcePath, text, evidenceBank, resumeCorpus, index = null) {
  const metrics = unique(text.match(METRIC_PATTERN) ?? []);
  const unsupportedMetrics = metrics.filter((metric) => !normalize(resumeCorpus).includes(normalize(metric)));
  const tokens = significantTerms(text);
  const evidence = evidenceBank.items.map((item) => ({
    id: item.id,
    sourcePath: item.sourcePath,
    overlap: tokens.filter((token) => includesTerm(normalize(item.text), token)).length,
  })).filter((item) => item.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap || left.sourcePath.localeCompare(right.sourcePath))
    .slice(0, 8);
  const resumeTerms = significantTerms(resumeCorpus);
  return {
    kind,
    index,
    sourcePath,
    characters: text.length,
    evidence: evidence.map(({ overlap: _overlap, ...item }) => item),
    metrics,
    unsupportedMetrics,
    newTermsForReview: tokens.filter((term) => !resumeTerms.includes(term)).slice(0, 30),
  };
}

function validateProfile(profile) {
  if (!isPlainObject(profile)) throw new TypeError("profile must be an object");
  const allowed = new Set(["headline", "about", "experience"]);
  const unsupported = Object.keys(profile).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported LinkedIn profile field: ${unsupported}`);
  const experience = profile.experience ?? [];
  if (!Array.isArray(experience) || experience.length > MAX_EXPERIENCES) {
    throw new RangeError(`profile.experience must contain at most ${MAX_EXPERIENCES} entries`);
  }
  return {
    headline: boundedText(profile.headline, "profile.headline", 500),
    about: profile.about === undefined ? null : boundedText(profile.about, "profile.about", MAX_TEXT),
    experience: experience.map((item, index) => {
      if (!isPlainObject(item)) throw new TypeError(`profile.experience[${index}] must be an object`);
      const itemAllowed = new Set(["sourcePath", "text"]);
      const itemUnsupported = Object.keys(item).find((key) => !itemAllowed.has(key));
      if (itemUnsupported) throw new Error(`Unsupported profile.experience[${index}] field: ${itemUnsupported}`);
      return {
        sourcePath: boundedText(item.sourcePath, `profile.experience[${index}].sourcePath`, 300),
        text: boundedText(item.text, `profile.experience[${index}].text`, MAX_TEXT),
      };
    }),
  };
}

function validateOptions(options) {
  if (!isPlainObject(options)) throw new TypeError("options must be an object");
  const allowed = new Set(["targetRole"]);
  const unsupported = Object.keys(options).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported LinkedIn profile option: ${unsupported}`);
  return {
    targetRole: options.targetRole === undefined
      ? undefined
      : boundedText(options.targetRole, "targetRole", 200),
  };
}

function assertValidResume(resume) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
  }
}

function significantTerms(value) {
  return unique(normalize(value).split(" ").filter((term) => (
    term.length >= 3 && !STOP_WORDS.has(term) && !/^\d/.test(term)
  )));
}

function includesTerm(text, term) {
  return ` ${text} `.includes(` ${term} `);
}

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}+#]+/gu, " ").trim();
}

function boundedText(value, field, maximum) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${field} must contain between 1 and ${maximum} characters`);
  }
  return value.trim();
}

function unique(values) {
  return [...new Set(values)];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
