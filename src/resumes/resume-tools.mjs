import jsonResumeSchema from "@jsonresume/schema";
import { getRecommendations, validateATS } from "@jsonresume/ats-validator";

const STOP_WORDS = new Set([
  "and", "are", "con", "del", "desde", "for", "las", "los", "para", "por",
  "que", "the", "una", "uno", "with", "years", "anos", "años", "will",
  "your", "you", "our", "sus", "como", "esta", "este", "job", "role",
]);

export const RESUME_TEMPLATES = ["classic", "compact", "technical"];

export function validateResume(resume) {
  if (!isPlainObject(resume)) {
    return invalidResume("instance", "must be a JSON object");
  }
  if (JSON.stringify(resume).length > 1_000_000) {
    return invalidResume("instance", "must not exceed 1 MB");
  }

  let schemaErrors = [];
  jsonResumeSchema.validate(resume, (errors) => {
    schemaErrors = (errors ?? []).map((error) => ({
      path: error.property || "instance",
      message: error.message,
    }));
  });

  const errors = [...schemaErrors];
  const warnings = [];
  if (!hasText(resume.basics?.name)) {
    errors.push({ path: "instance.basics.name", message: "is required" });
  }
  if (!hasText(resume.basics?.email)) {
    errors.push({ path: "instance.basics.email", message: "is required" });
  }
  if (![resume.work, resume.education, resume.projects].some(hasItems)) {
    errors.push({
      path: "instance",
      message: "must include work, education, or projects",
    });
  }
  if (!hasText(resume.basics?.phone)) {
    warnings.push({ path: "instance.basics.phone", message: "is recommended for ATS parsing" });
  }
  if (!hasItems(resume.skills)) {
    warnings.push({ path: "instance.skills", message: "is recommended for job matching" });
  }

  return {
    valid: errors.length === 0,
    standard: "JSON Resume 1.x",
    errors,
    warnings,
  };
}

export function renderResumeHtml(resume, template = "classic") {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }

  const selectedTemplate = selectResumeTemplate(template);
  const style = htmlTemplateStyle(selectedTemplate);
  const basics = resume.basics;
  const language = safeLanguage(resume.meta?.language);
  const labels = sectionLabels(language);
  const sections = [
    renderWork(resume.work, labels.work, labels.present),
    renderProjects(resume.projects, labels.projects),
    renderEducation(resume.education, labels.education, labels.present),
    renderSkills(resume.skills, labels.skills),
    renderCertificates(resume.certificates, labels.certificates),
    renderLanguages(resume.languages, labels.languages),
  ].filter(Boolean).join("\n");

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(basics.name)} - ${labels.resume}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { color: #111; background: #fff; font: ${style.bodySize}pt/${style.lineHeight} Arial, Helvetica, sans-serif; margin: 0 auto; max-width: 760px; }
  header { border-bottom: ${style.headerBorder}; padding-bottom: ${style.headerPadding}px; }
  h1 { color: ${style.accent}; font-size: ${style.nameSize}pt; margin: 0 0 2px; }
  h2 { border-bottom: ${style.sectionBorder}; color: ${style.accent}; font-size: ${style.sectionSize}pt; margin: ${style.sectionMargin}px 0 ${style.sectionGap}px; padding-bottom: 2px; }
  h3 { font-size: ${style.entrySize}pt; margin: ${style.entryMargin}px 0 2px; }
  p { margin: ${style.paragraphMargin}px 0; }
  ul { margin: ${style.paragraphMargin}px 0 ${style.listGap}px 20px; padding: 0; }
  li { margin: ${style.itemMargin}px 0; }
  .meta { color: #333; }
  a { color: #111; }
  @media print { a { text-decoration: none; } }
</style>
</head>
<body data-template="${selectedTemplate}">
<header>
  <h1>${escapeHtml(basics.name)}</h1>
  ${paragraph(basics.label)}
  <p>${renderContact(basics)}</p>
  ${paragraph(basics.summary)}
</header>
<main>
${sections}
</main>
</body>
</html>`;
}

export function analyzeResumeAts(resume, template = "classic") {
  const selectedTemplate = selectResumeTemplate(template);
  const html = renderResumeHtml(resume, selectedTemplate);
  const result = validateATS(html);
  return {
    ...result,
    template: selectedTemplate,
    recommendations: getRecommendations(result),
    disclaimer: "Heuristic structural check; no external ATS result is guaranteed.",
  };
}

export function analyzeResumeJobMatch(resume, jobDescription) {
  if (!hasText(jobDescription)) {
    throw new TypeError("jobDescription is required");
  }
  const resumeText = normalizeText(flattenStrings(resume).join(" "));
  const jobText = normalizeText(jobDescription);
  const resumeSkills = unique(
    (resume.skills ?? []).flatMap((skill) => [skill.name, ...(skill.keywords ?? [])]),
  ).filter(hasText);
  const matchedSkills = resumeSkills.filter((skill) => jobText.includes(normalizeText(skill)));
  const jobKeywords = rankedKeywords(jobDescription, 20);
  const matchedKeywords = jobKeywords.filter((keyword) => resumeText.includes(keyword));
  const missingKeywords = jobKeywords.filter((keyword) => !resumeText.includes(keyword));

  return {
    score: jobKeywords.length === 0 ? 0 : Math.round((matchedKeywords.length / jobKeywords.length) * 100),
    matchedSkills,
    matchedKeywords,
    missingKeywords,
    reviewRequired: true,
    disclaimer:
      "Keyword overlap is advisory. Add a missing term only when the base resume or the user supports it.",
  };
}

export function planResumeVariant(resume, jobDescription) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }

  if (!hasText(jobDescription)) {
    throw new TypeError("jobDescription is required");
  }

  const jobKeywords = rankedKeywords(jobDescription, 25);
  const allEvidence = resumeEvidence(resume)
    .map((item) => ({
      ...item,
      matchedKeywords: jobKeywords.filter((keyword) => normalizeText(item.text).includes(keyword)),
    }))
    .filter((item) => item.matchedKeywords.length > 0)
    .map((item) => ({ ...item, score: item.matchedKeywords.length }))
    .sort((a, b) => b.score - a.score || a.sourcePath.localeCompare(b.sourcePath));
  const evidence = allEvidence.slice(0, 12);
  const supportedKeywords = unique(allEvidence.flatMap((item) => item.matchedKeywords));
  const unsupportedKeywords = jobKeywords.filter((keyword) => !supportedKeywords.includes(keyword));
  const availableSections = unique(resumeEvidence(resume).map((item) => item.section));
  const sectionOrder = availableSections
    .map((section, defaultOrder) => ({
      section,
      score: unique(
        evidence.filter((item) => item.section === section).flatMap((item) => item.matchedKeywords),
      ).length,
      defaultOrder,
    }))
    .sort((a, b) => b.score - a.score || a.defaultOrder - b.defaultOrder)
    .map(({ section }) => section);

  return {
    status: "plan-ready",
    supportedKeywords,
    unsupportedKeywords,
    evidence,
    sectionOrder,
    reviewQuestions: unsupportedKeywords.slice(0, 8).map((keyword) => ({
      keyword,
      question: `Can you confirm truthful evidence for "${keyword}"?`,
    })),
    instructions: [
      "Reorder or emphasize only the listed evidence paths.",
      "Do not add unsupported keywords unless the user confirms evidence.",
      "Audit the completed variant against the base resume before rendering it.",
    ],
    humanReviewRequired: true,
    disclaimer: "This plan ranks existing resume evidence; it does not create candidate facts.",
  };
}

export function auditResumeVariant(baseResume, variantResume) {
  const baseValidation = validateResume(baseResume);
  const variantValidation = validateResume(variantResume);
  const issues = [];

  compareSet(issues, "work employer", values(baseResume.work, "name"), values(variantResume.work, "name"));
  compareSet(issues, "work position", values(baseResume.work, "position"), values(variantResume.work, "position"));
  compareSet(issues, "work start date", values(baseResume.work, "startDate"), values(variantResume.work, "startDate"));
  compareSet(issues, "work end date", values(baseResume.work, "endDate"), values(variantResume.work, "endDate"));
  compareSet(issues, "education institution", values(baseResume.education, "institution"), values(variantResume.education, "institution"));
  compareSet(issues, "education qualification", qualificationValues(baseResume.education), qualificationValues(variantResume.education));
  compareSet(issues, "education date", educationDateValues(baseResume.education), educationDateValues(variantResume.education));
  compareSet(issues, "certificate", certificateValues(baseResume.certificates), certificateValues(variantResume.certificates));
  compareSet(issues, "project", values(baseResume.projects, "name"), values(variantResume.projects, "name"));
  compareSet(issues, "skill", skillValues(baseResume.skills), skillValues(variantResume.skills));
  compareSet(issues, "language", languageValues(baseResume.languages), languageValues(variantResume.languages));
  compareSet(issues, "numeric claim", numericClaims(baseResume), numericClaims(variantResume));

  for (const field of ["name", "email", "phone", "url"]) {
    if (normalizeText(baseResume.basics?.[field]) !== normalizeText(variantResume.basics?.[field])) {
      issues.push({ type: "identity-change", field: `basics.${field}` });
    }
  }

  return {
    status:
      baseValidation.valid && variantValidation.valid && issues.length === 0
        ? "no-structural-additions-detected"
        : "review-required",
    baseValid: baseValidation.valid,
    variantValid: variantValidation.valid,
    humanReviewRequired: true,
    issues,
    disclaimer:
      "Text rewording still needs human review; this audit only detects selected structural and factual additions.",
  };
}

function invalidResume(path, message) {
  return { valid: false, standard: "JSON Resume 1.x", errors: [{ path, message }], warnings: [] };
}

function selectResumeTemplate(value) {
  if (!RESUME_TEMPLATES.includes(value)) {
    throw new Error(`Unknown resume template: ${value}`);
  }
  return value;
}

function htmlTemplateStyle(template) {
  if (template === "compact") {
    return {
      accent: "#111111", bodySize: 10, lineHeight: 1.25, nameSize: 20,
      sectionSize: 12.5, entrySize: 10.5, headerBorder: "1px solid #444444",
      sectionBorder: "1px solid #aaaaaa", headerPadding: 6, sectionMargin: 12,
      sectionGap: 5, entryMargin: 7, paragraphMargin: 2, listGap: 4, itemMargin: 1,
    };
  }
  if (template === "technical") {
    return {
      accent: "#17324d", bodySize: 10.5, lineHeight: 1.35, nameSize: 21,
      sectionSize: 13, entrySize: 11, headerBorder: "2px solid #17324d",
      sectionBorder: "1px solid #587087", headerPadding: 8, sectionMargin: 16,
      sectionGap: 7, entryMargin: 9, paragraphMargin: 3, listGap: 6, itemMargin: 2,
    };
  }
  return {
    accent: "#111111", bodySize: 11, lineHeight: 1.4, nameSize: 22,
    sectionSize: 14, entrySize: 11.5, headerBorder: "1px solid #555555",
    sectionBorder: "1px solid #999999", headerPadding: 8, sectionMargin: 18,
    sectionGap: 8, entryMargin: 10, paragraphMargin: 4, listGap: 8, itemMargin: 2,
  };
}

function resumeEvidence(resume) {
  const items = [];
  addEvidence(items, "summary", "basics.summary", resume.basics?.summary);
  for (const [index, work] of (resume.work ?? []).entries()) {
    addEvidence(items, "work", `work[${index}].summary`, work.summary);
    for (const [highlightIndex, highlight] of (work.highlights ?? []).entries()) {
      addEvidence(items, "work", `work[${index}].highlights[${highlightIndex}]`, highlight);
    }
  }
  for (const [index, project] of (resume.projects ?? []).entries()) {
    addEvidence(items, "projects", `projects[${index}].description`, project.description || project.summary);
    for (const [highlightIndex, highlight] of (project.highlights ?? []).entries()) {
      addEvidence(items, "projects", `projects[${index}].highlights[${highlightIndex}]`, highlight);
    }
  }
  for (const [index, skill] of (resume.skills ?? []).entries()) {
    addEvidence(
      items,
      "skills",
      `skills[${index}]`,
      joinPresent([skill.name, ...(skill.keywords ?? [])], ", "),
    );
  }
  for (const [index, certificate] of (resume.certificates ?? []).entries()) {
    addEvidence(
      items,
      "certificates",
      `certificates[${index}]`,
      joinPresent([certificate.name, certificate.issuer], " - "),
    );
  }
  for (const [index, education] of (resume.education ?? []).entries()) {
    addEvidence(
      items,
      "education",
      `education[${index}]`,
      joinPresent([education.studyType, education.area, education.institution], " - "),
    );
  }
  for (const [index, language] of (resume.languages ?? []).entries()) {
    addEvidence(
      items,
      "languages",
      `languages[${index}]`,
      joinPresent([language.language, language.fluency], " - "),
    );
  }
  return items;
}

function addEvidence(items, section, sourcePath, text) {
  if (hasText(text)) items.push({ section, sourcePath, text });
}

function renderWork(items, title, present) {
  return renderEntries(title, items, (item) => `
  <article>
    <h3>${escapeHtml(joinPresent([item.position, item.name], " - "))}</h3>
    ${metaLine(item.startDate, item.endDate, item.location, present)}
    ${paragraph(item.summary)}
    ${list(item.highlights)}
  </article>`);
}

function renderProjects(items, title) {
  return renderEntries(title, items, (item) => `
  <article>
    <h3>${escapeHtml(item.name)}</h3>
    ${paragraph(item.description || item.summary)}
    ${list(item.highlights)}
  </article>`);
}

function renderEducation(items, title, present) {
  return renderEntries(title, items, (item) => `
  <article>
    <h3>${escapeHtml(joinPresent([item.studyType, item.area], " - "))}</h3>
    <p>${escapeHtml(item.institution)}</p>
    ${metaLine(item.startDate, item.endDate, undefined, present)}
  </article>`);
}

function renderSkills(items, title) {
  return renderEntries(title, items, (item) =>
    `<p><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml((item.keywords ?? []).join(", "))}</p>`,
  );
}

function renderCertificates(items, title) {
  return renderEntries(title, items, (item) =>
    `<p><strong>${escapeHtml(item.name)}</strong>${item.issuer ? ` - ${escapeHtml(item.issuer)}` : ""}${item.date ? ` (${escapeHtml(item.date)})` : ""}</p>`,
  );
}

function renderLanguages(items, title) {
  return renderEntries(title, items, (item) =>
    `<p><strong>${escapeHtml(item.language)}:</strong> ${escapeHtml(item.fluency)}</p>`,
  );
}

function renderEntries(title, items, renderItem) {
  return hasItems(items)
    ? `<section>\n<h2>${title}</h2>\n${items.map(renderItem).join("\n")}\n</section>`
    : "";
}

function renderContact(basics) {
  const location = joinPresent([
    basics.location?.city,
    basics.location?.region,
    basics.location?.countryCode,
  ], ", ");
  return [basics.email, basics.phone, location, safeHttpUrl(basics.url)]
    .filter(hasText)
    .map(escapeHtml)
    .join(" | ");
}

function metaLine(startDate, endDate, location, present) {
  const dates = startDate ? `${startDate} - ${endDate || present}` : "";
  const value = joinPresent([dates, location], " | ");
  return value ? `<p class="meta">${escapeHtml(value)}</p>` : "";
}

function paragraph(value) {
  return hasText(value) ? `<p>${escapeHtml(value)}</p>` : "";
}

function list(items) {
  return hasItems(items)
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
}

function compareSet(issues, type, baseValues, variantValues) {
  const base = new Set(baseValues.map(normalizeText));
  for (const value of variantValues) {
    if (hasText(value) && !base.has(normalizeText(value))) {
      issues.push({ type: "unsupported-addition", field: type, value });
    }
  }
}

function values(items, key) {
  return (items ?? []).map((item) => item?.[key]).filter(hasText);
}

function skillValues(items) {
  return (items ?? []).flatMap((item) => [item.name, ...(item.keywords ?? [])]).filter(hasText);
}

function qualificationValues(items) {
  return (items ?? []).map((item) => joinPresent([item.studyType, item.area], " | ")).filter(hasText);
}

function educationDateValues(items) {
  return (items ?? []).flatMap((item) => [item.startDate, item.endDate]).filter(hasText);
}

function certificateValues(items) {
  return (items ?? []).map((item) => joinPresent([item.name, item.issuer, item.date], " | ")).filter(hasText);
}

function languageValues(items) {
  return (items ?? []).map((item) => joinPresent([item.language, item.fluency], " | ")).filter(hasText);
}

function numericClaims(value) {
  return unique(flattenStrings(value).flatMap((text) => text.match(/(?:[$€£]\s*)?\d+(?:[.,]\d+)?\s*%?/g) ?? []));
}

function rankedKeywords(text, limit) {
  const counts = new Map();
  for (const rawToken of normalizeText(text).split(/[^a-z0-9#+.]+/)) {
    const token = rawToken.replace(/^\.+|\.+$/g, "");
    if (token.length < 3 || STOP_WORDS.has(token) || /^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function flattenStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (isPlainObject(value)) return Object.values(value).flatMap(flattenStrings);
  return [];
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function safeHttpUrl(value) {
  if (!hasText(value)) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function safeLanguage(value) {
  return /^[a-z]{2,3}(?:-[a-z]{2})?$/i.test(value ?? "") ? value : "en";
}

function sectionLabels(language) {
  return language.toLowerCase().startsWith("es")
    ? {
        resume: "Currículum",
        work: "Experiencia profesional",
        projects: "Proyectos",
        education: "Formación",
        skills: "Competencias",
        certificates: "Certificaciones",
        languages: "Idiomas",
        present: "Actualidad",
      }
    : {
        resume: "Resume",
        work: "Work Experience",
        projects: "Projects",
        education: "Education",
        skills: "Skills",
        certificates: "Certifications",
        languages: "Languages",
        present: "Present",
      };
}

function unique(values) {
  return [...new Set(values)];
}

function joinPresent(values, separator) {
  return values.filter(hasText).join(separator);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
