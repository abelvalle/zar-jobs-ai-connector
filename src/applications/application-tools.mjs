import { planResumeVariant, validateResume } from "../resumes/resume-tools.mjs";

const MAX_APPLICATION_TEXT = 100_000;
const MAX_QUESTIONS = 20;
const STOP_WORDS = new Set([
  "and", "are", "but", "for", "from", "have", "into", "that", "the", "their", "this", "with",
  "con", "del", "desde", "esta", "para", "por", "que", "una", "uno", "las", "los",
]);
const CANDIDATE_MARKERS = /\b(?:i|i'm|i’ve|i've|my|me|mine|yo|soy|tengo|mi|mis|he|logre|logré|trabaje|trabajé)\b/i;

export function planCoverLetter(resume, jobDescription, target = {}) {
  assertValidResume(resume);
  assertText(jobDescription, "jobDescription");
  const plan = planResumeVariant(resume, jobDescription);
  const evidence = plan.evidence.slice(0, 8);

  return {
    status: "plan-ready",
    target: {
      company: textOrNull(target.company),
      role: textOrNull(target.role),
    },
    outline: [
      { section: "opening", instruction: "State the target role and motivation without adding candidate facts.", evidencePaths: [] },
      { section: "fit", instruction: "Connect the strongest supported requirements to the candidate.", evidencePaths: evidence.slice(0, 3).map(pathOf) },
      { section: "proof", instruction: "Use one or two concrete, traceable examples from the base resume.", evidencePaths: evidence.slice(3, 6).map(pathOf) },
      { section: "closing", instruction: "Express interest and request a conversation without inventing availability or terms.", evidencePaths: [] },
    ],
    evidence,
    unsupportedKeywords: plan.unsupportedKeywords,
    reviewQuestions: plan.reviewQuestions,
    generatedText: false,
    humanReviewRequired: true,
    stored: false,
  };
}

export function planScreeningAnswers(resume, questions) {
  assertValidResume(resume);
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > MAX_QUESTIONS) {
    throw new TypeError(`questions must contain between 1 and ${MAX_QUESTIONS} items`);
  }

  return {
    status: "plan-ready",
    questions: questions.map((question, index) => {
      assertText(question, `questions[${index}]`, 2_000);
      const plan = planResumeVariant(resume, question);
      return {
        index,
        question,
        evidence: plan.evidence.slice(0, 5),
        unsupportedKeywords: plan.unsupportedKeywords,
        needsUserInput: plan.evidence.length === 0 || plan.unsupportedKeywords.length > 0,
      };
    }),
    generatedAnswers: false,
    humanReviewRequired: true,
    stored: false,
  };
}

export function auditApplicationText(resume, applicationText, jobDescription = "") {
  assertValidResume(resume);
  assertText(applicationText, "applicationText");
  if (jobDescription !== "") assertText(jobDescription, "jobDescription");

  const evidence = resumeEvidence(resume);
  const resumeCorpus = normalize(flattenStrings(resume).join(" "));
  const jobCorpus = normalize(jobDescription);
  const sentences = splitSentences(applicationText).map((text, index) => {
    const tokens = keywords(text);
    const matches = evidence
      .map((item) => ({
        ...item,
        overlap: tokens.filter((token) => normalize(item.text).includes(token)).length,
      }))
      .filter((item) => item.overlap > 0)
      .sort((left, right) => right.overlap - left.overlap || left.sourcePath.localeCompare(right.sourcePath))
      .slice(0, 4)
      .map(({ overlap: _overlap, ...item }) => item);
    const numericClaims = numbers(text);
    const unsupportedNumbers = numericClaims.filter(
      (claim) => !resumeCorpus.includes(normalize(claim)) && !jobCorpus.includes(normalize(claim)),
    );
    const candidateClaim = CANDIDATE_MARKERS.test(normalize(text));
    const jobContextOnly = matches.length === 0 && tokens.some((token) => jobCorpus.includes(token));
    const status = unsupportedNumbers.length > 0
      ? "unsupported-numeric-claim"
      : matches.length > 0
        ? "resume-evidence-found"
        : candidateClaim
          ? jobContextOnly ? "job-context-only" : "no-resume-evidence"
          : "neutral-text";
    return {
      index,
      text,
      status,
      evidence: matches,
      unsupportedNumbers,
    };
  });
  const flagged = sentences.filter((item) => [
    "unsupported-numeric-claim",
    "job-context-only",
    "no-resume-evidence",
  ].includes(item.status));

  return {
    status: flagged.length > 0 ? "review-required" : "no-selected-unsupported-claims-detected",
    sentences,
    flaggedCount: flagged.length,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "This deterministic audit can miss semantic fabrications and false implications. Human review remains mandatory.",
  };
}

export function prepareApplicationKit({
  resume,
  jobDescription,
  target,
  coverLetter,
  screeningAnswers = [],
  template = "classic",
}) {
  assertValidResume(resume);
  assertText(jobDescription, "jobDescription");
  if (!isPlainObject(target) || !hasText(target.company) || !hasText(target.role)) {
    throw new TypeError("target.company and target.role are required");
  }
  if (!Array.isArray(screeningAnswers) || screeningAnswers.length > MAX_QUESTIONS) {
    throw new TypeError(`screeningAnswers must contain at most ${MAX_QUESTIONS} items`);
  }
  if (!["classic", "compact", "technical"].includes(template)) {
    throw new TypeError("template must be classic, compact, or technical");
  }

  const resumePlan = planResumeVariant(resume, jobDescription);
  const coverLetterAudit = hasText(coverLetter)
    ? auditApplicationText(resume, coverLetter, jobDescription)
    : null;
  const answerAudits = screeningAnswers.map((answer, index) => {
    if (!isPlainObject(answer)) throw new TypeError(`screeningAnswers[${index}] must be an object`);
    assertText(answer.question, `screeningAnswers[${index}].question`, 2_000);
    assertText(answer.answer, `screeningAnswers[${index}].answer`, MAX_APPLICATION_TEXT);
    return {
      index,
      question: answer.question,
      audit: auditApplicationText(resume, answer.answer, jobDescription),
    };
  });
  const hasFlags = coverLetterAudit?.status === "review-required"
    || answerAudits.some((item) => item.audit.status === "review-required");
  const stem = safeStem(`${target.company}-${target.role}`);

  return {
    status: hasFlags ? "review-required" : "ready-for-human-review",
    target: { company: target.company.trim(), role: target.role.trim() },
    template,
    suggestedFiles: {
      resumePdf: `${stem}.pdf`,
      resumeDocx: `${stem}.docx`,
      coverLetter: hasText(coverLetter) ? `${stem}-cover-letter.txt` : null,
    },
    resumePlan,
    coverLetterAudit,
    screeningAnswerAudits: answerAudits,
    checklist: [
      { item: "Review unsupported resume-plan keywords", complete: resumePlan.unsupportedKeywords.length === 0 },
      { item: "Review cover-letter audit", complete: coverLetterAudit === null || coverLetterAudit.status !== "review-required" },
      { item: "Review screening-answer audits", complete: !answerAudits.some((item) => item.audit.status === "review-required") },
      { item: "Render PDF and DOCX with the selected template", complete: false },
      { item: "Open final files and approve the application manually", complete: false },
    ],
    nextTools: ["render_resume_pdf", "render_resume_docx"],
    finalApprovalRequired: true,
    submissionPerformed: false,
    stored: false,
  };
}

function resumeEvidence(resume) {
  const output = [];
  collectEvidence(resume.basics?.summary, "basics.summary", output);
  for (const [index, item] of (resume.work ?? []).entries()) {
    collectEvidence(item.summary, `work[${index}].summary`, output);
    for (const [highlightIndex, text] of (item.highlights ?? []).entries()) {
      collectEvidence(text, `work[${index}].highlights[${highlightIndex}]`, output);
    }
  }
  for (const [index, item] of (resume.projects ?? []).entries()) {
    collectEvidence(item.description ?? item.summary, `projects[${index}].description`, output);
    for (const [highlightIndex, text] of (item.highlights ?? []).entries()) {
      collectEvidence(text, `projects[${index}].highlights[${highlightIndex}]`, output);
    }
  }
  for (const [index, item] of (resume.skills ?? []).entries()) {
    collectEvidence([item.name, ...(item.keywords ?? [])].filter(hasText).join(", "), `skills[${index}]`, output);
  }
  return output;
}

function collectEvidence(text, sourcePath, output) {
  if (hasText(text)) output.push({ sourcePath, text });
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+|\r?\n+/).map((item) => item.trim()).filter(hasText);
}

function keywords(text) {
  return [...new Set(normalize(text).split(/[^a-z0-9#+.]+/).filter(
    (token) => token.length >= 3 && !STOP_WORDS.has(token) && !/^\d+$/.test(token),
  ))];
}

function numbers(text) {
  return [...new Set(text.match(/(?:[$€£]\s*)?\d+(?:[.,]\d+)?\s*%?/g) ?? [])];
}

function flattenStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (isPlainObject(value)) return Object.values(value).flatMap(flattenStrings);
  return [];
}

function normalize(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function safeStem(value) {
  const stem = String(value).normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 95);
  return stem || "application";
}

function pathOf(item) {
  return item.sourcePath;
}

function assertValidResume(resume) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
}

function assertText(value, label, max = MAX_APPLICATION_TEXT) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new TypeError(`${label} must contain between 1 and ${max} characters`);
  }
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
