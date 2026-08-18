import { createHash } from "node:crypto";

import { normalizeResumeLocale, resumeSectionLabels } from "./resume-labels.mjs";
import { validateResume } from "./resume-tools.mjs";

const MAX_JOB_DESCRIPTION = 100_000;
const STOP_WORDS = new Set([
  "about", "and", "are", "avec", "como", "con", "das", "del", "der", "des", "die",
  "ein", "eine", "for", "from", "gli", "las", "les", "los", "mit", "para", "per",
  "por", "que", "the", "una", "und", "une", "uno", "with", "your",
]);
const EUROPASS_SOURCES = Object.freeze([
  "https://europass.europa.eu/en/stakeholders/interoperability-europass",
  "https://europass.europa.eu/en/europass-profile-and-interoperability",
]);

export function prepareResumeLocale(resume, locale) {
  assertValidResume(resume);
  normalizeResumeLocale(locale);
  const localizedResume = structuredClone(resume);
  localizedResume.meta = { ...(localizedResume.meta ?? {}), language: locale };

  return {
    locale,
    language: locale.slice(0, 2).toLowerCase(),
    labels: resumeSectionLabels(locale),
    localizedResume,
    translationReviewPaths: translationPaths(resume),
    contentTranslated: false,
    factsAdded: false,
    humanReviewRequired: true,
    stored: false,
    safeNextAction:
      "Translate only the listed prose with user review, preserve proper names and metrics, then audit the variant against the base resume.",
  };
}

export function prepareEuropassMapping(resume, locale = "en") {
  assertValidResume(resume);
  normalizeResumeLocale(locale);
  const basics = resume.basics;

  return {
    format: "zar-jobs-europass-mapping-draft-v1",
    locale,
    mapping: {
      person: {
        fullName: basics.name,
        email: textOrNull(basics.email),
        phone: textOrNull(basics.phone),
        website: textOrNull(basics.url),
        location: basics.location
          ? {
              city: textOrNull(basics.location.city),
              region: textOrNull(basics.location.region),
              countryCode: textOrNull(basics.location.countryCode),
            }
          : null,
        sourcePath: "basics",
      },
      headline: sourcedValue(basics.label, "basics.label"),
      summary: sourcedValue(basics.summary, "basics.summary"),
      workExperiences: (resume.work ?? []).map((item, index) => ({
        employer: textOrNull(item.name),
        position: textOrNull(item.position),
        location: textOrNull(item.location),
        startDate: textOrNull(item.startDate),
        endDate: textOrNull(item.endDate),
        summary: textOrNull(item.summary),
        highlights: stringArray(item.highlights),
        sourcePath: `work[${index}]`,
      })),
      education: (resume.education ?? []).map((item, index) => ({
        institution: textOrNull(item.institution),
        qualification: textOrNull(item.studyType),
        field: textOrNull(item.area),
        startDate: textOrNull(item.startDate),
        endDate: textOrNull(item.endDate),
        sourcePath: `education[${index}]`,
      })),
      skills: (resume.skills ?? []).map((item, index) => ({
        name: textOrNull(item.name),
        keywords: stringArray(item.keywords),
        sourcePath: `skills[${index}]`,
      })),
      languages: (resume.languages ?? []).map((item, index) => ({
        language: textOrNull(item.language),
        fluency: textOrNull(item.fluency),
        sourcePath: `languages[${index}]`,
      })),
      certificates: (resume.certificates ?? []).map((item, index) => ({
        name: textOrNull(item.name),
        issuer: textOrNull(item.issuer),
        date: textOrNull(item.date),
        sourcePath: `certificates[${index}]`,
      })),
      additionalProjects: (resume.projects ?? []).map((item, index) => ({
        name: textOrNull(item.name),
        description: textOrNull(item.description ?? item.summary),
        highlights: stringArray(item.highlights),
        sourcePath: `projects[${index}]`,
      })),
    },
    compatibility: {
      officialEuropassImport: false,
      europeanLearningModelCredential: false,
      europeanDigitalCredential: false,
      manualTransferReviewRequired: true,
    },
    officialSources: [...EUROPASS_SOURCES],
    loginPerformed: false,
    networkAccess: false,
    stored: false,
    humanReviewRequired: true,
    disclaimer:
      "This is a traceable Zar Jobs mapping draft, not an official Europass import file, ELM profile, or digital credential.",
  };
}

export function buildEvidenceBank(resume) {
  assertValidResume(resume);
  const items = [];
  addEvidence(items, "summary", "basics.summary", resume.basics?.summary);
  for (const [index, work] of (resume.work ?? []).entries()) {
    addEvidence(
      items,
      "work-identity",
      `work[${index}]`,
      [work.position, work.name].filter(hasText).join(" at "),
    );
    addEvidence(items, "work-summary", `work[${index}].summary`, work.summary);
    for (const [highlightIndex, highlight] of (work.highlights ?? []).entries()) {
      addEvidence(items, "work-highlight", `work[${index}].highlights[${highlightIndex}]`, highlight);
    }
  }
  for (const [index, project] of (resume.projects ?? []).entries()) {
    addEvidence(items, "project-identity", `projects[${index}].name`, project.name);
    addEvidence(
      items,
      "project-summary",
      `projects[${index}].description`,
      project.description ?? project.summary,
    );
    for (const [highlightIndex, highlight] of (project.highlights ?? []).entries()) {
      addEvidence(items, "project-highlight", `projects[${index}].highlights[${highlightIndex}]`, highlight);
    }
  }
  for (const [index, skill] of (resume.skills ?? []).entries()) {
    addEvidence(
      items,
      "skill",
      `skills[${index}]`,
      [skill.name, ...(skill.keywords ?? [])].filter(hasText).join(", "),
    );
  }
  for (const [index, education] of (resume.education ?? []).entries()) {
    addEvidence(
      items,
      "education",
      `education[${index}]`,
      [education.studyType, education.area, education.institution].filter(hasText).join(", "),
    );
  }
  for (const [index, certificate] of (resume.certificates ?? []).entries()) {
    addEvidence(
      items,
      "certificate",
      `certificates[${index}]`,
      [certificate.name, certificate.issuer, certificate.date].filter(hasText).join(", "),
    );
  }
  for (const [index, language] of (resume.languages ?? []).entries()) {
    addEvidence(
      items,
      "language",
      `languages[${index}]`,
      [language.language, language.fluency].filter(hasText).join(", "),
    );
  }

  const bankHash = createHash("sha256")
    .update(JSON.stringify(items))
    .digest("hex");
  return {
    schemaVersion: 1,
    source: "validated-json-resume",
    bankHash,
    items,
    factsAdded: false,
    humanReviewRequired: true,
    stored: false,
  };
}

export function matchResumeEvidence(resume, jobDescription) {
  assertValidResume(resume);
  assertText(jobDescription, "jobDescription", MAX_JOB_DESCRIPTION);
  const bank = buildEvidenceBank(resume);
  const jobTopics = rankedKeywords(jobDescription, 30);
  const matches = bank.items
    .map((item) => ({
      evidenceId: item.id,
      sourcePath: item.sourcePath,
      category: item.category,
      text: item.text,
      metrics: item.metrics,
      matchedTopics: jobTopics.filter((topic) => item.keywords.includes(topic)),
    }))
    .filter((item) => item.matchedTopics.length > 0)
    .sort((left, right) =>
      right.matchedTopics.length - left.matchedTopics.length
      || left.sourcePath.localeCompare(right.sourcePath));
  const supportedTopics = unique(matches.flatMap((item) => item.matchedTopics));

  return {
    bankHash: bank.bankHash,
    jobTopics,
    supportedTopics,
    unsupportedTopics: jobTopics.filter((topic) => !supportedTopics.includes(topic)),
    matches,
    factsAdded: false,
    method: "deterministic-keyword-evidence-v1",
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "Literal keyword overlap can miss semantic evidence and cannot verify truth. Unsupported topics must not be added without user-confirmed evidence.",
  };
}

function translationPaths(resume) {
  const paths = [];
  pushPath(paths, "basics.label", resume.basics?.label);
  pushPath(paths, "basics.summary", resume.basics?.summary);
  for (const [index, work] of (resume.work ?? []).entries()) {
    pushPath(paths, `work[${index}].position`, work.position);
    pushPath(paths, `work[${index}].summary`, work.summary);
    for (const [highlightIndex, highlight] of (work.highlights ?? []).entries()) {
      pushPath(paths, `work[${index}].highlights[${highlightIndex}]`, highlight);
    }
  }
  for (const [index, project] of (resume.projects ?? []).entries()) {
    pushPath(paths, `projects[${index}].description`, project.description ?? project.summary);
    for (const [highlightIndex, highlight] of (project.highlights ?? []).entries()) {
      pushPath(paths, `projects[${index}].highlights[${highlightIndex}]`, highlight);
    }
  }
  for (const [index, education] of (resume.education ?? []).entries()) {
    pushPath(paths, `education[${index}].studyType`, education.studyType);
    pushPath(paths, `education[${index}].area`, education.area);
  }
  for (const [index, language] of (resume.languages ?? []).entries()) {
    pushPath(paths, `languages[${index}].fluency`, language.fluency);
  }
  return paths;
}

function addEvidence(items, category, sourcePath, value) {
  if (!hasText(value)) return;
  const text = value.trim();
  const id = createHash("sha256").update(`${sourcePath}\0${text}`).digest("hex").slice(0, 20);
  items.push({
    id,
    category,
    sourcePath,
    text,
    metrics: unique(text.match(/(?:[$€£]\s*)?\d+(?:[.,]\d+)?\s*%?/g) ?? []),
    keywords: rankedKeywords(text, 30),
  });
}

function rankedKeywords(text, limit) {
  const counts = new Map();
  for (const raw of normalize(text).split(/[^a-z0-9#+.]+/)) {
    const token = raw.replace(/^\.+|\.+$/g, "");
    if (token.length < 3 || STOP_WORDS.has(token) || /^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function sourcedValue(value, sourcePath) {
  return hasText(value) ? { value: value.trim(), sourcePath } : null;
}

function stringArray(values) {
  return (values ?? []).filter(hasText).map((value) => value.trim());
}

function pushPath(paths, path, value) {
  if (hasText(value)) paths.push(path);
}

function assertValidResume(resume) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
}

function assertText(value, field, maxLength) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > maxLength) {
    throw new TypeError(`${field} must contain between 1 and ${maxLength} characters`);
  }
}

function textOrNull(value) {
  return hasText(value) ? value.trim() : null;
}

function normalize(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").trim();
}

function unique(values) {
  return [...new Set(values)];
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
