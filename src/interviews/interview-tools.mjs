import { auditApplicationText } from "../applications/application-tools.mjs";
import { planResumeVariant, validateResume } from "../resumes/resume-tools.mjs";

export const INTERVIEW_STAGES = Object.freeze([
  "general",
  "screening",
  "recruiter",
  "technical",
  "behavioral",
  "final",
]);

const STOP_WORDS = new Set([
  "about", "and", "are", "como", "con", "del", "describe", "for", "from", "how",
  "las", "los", "para", "por", "que", "tell", "the", "una", "what", "with", "you",
]);

export function planInterview(resume, jobDescription, target = {}) {
  assertValidResume(resume);
  assertText(jobDescription, "jobDescription", 100_000);
  if (!isPlainObject(target)) throw new TypeError("target must be an object");
  const stage = target.stage ?? "general";
  if (!INTERVIEW_STAGES.includes(stage)) {
    throw new TypeError(`stage must be one of: ${INTERVIEW_STAGES.join(", ")}`);
  }

  const plan = planResumeVariant(resume, jobDescription);
  const evidenceCards = plan.evidence.slice(0, 8).map((item) => ({
    sourcePath: item.sourcePath,
    section: item.section,
    text: item.text,
    matchedTopics: item.matchedKeywords,
  }));
  const technicalQuestions = plan.supportedKeywords.slice(0, 4).map((topic) => ({
    category: "technical",
    prompt: `Explain your direct experience with "${topic}" using only the linked resume evidence.`,
    topic,
    evidencePaths: evidenceCards
      .filter((item) => item.matchedTopics.includes(topic))
      .map((item) => item.sourcePath),
  }));
  const evidencePaths = evidenceCards.slice(0, 3).map((item) => item.sourcePath);
  const questionPlan = [
    {
      category: "motivation",
      prompt: "Why does this role fit your confirmed goals? Keep company-specific claims separate from candidate facts.",
      evidencePaths: [],
    },
    {
      category: "behavioral",
      prompt: "Prepare one Situation-Task-Action-Result example using a confirmed achievement.",
      evidencePaths,
    },
    ...technicalQuestions,
  ];

  return {
    status: "plan-ready",
    target: {
      company: textOrNull(target.company, "target.company", 200),
      role: textOrNull(target.role, "target.role", 200),
      stage,
    },
    supportedTopics: plan.supportedKeywords,
    evidenceCards,
    gapQuestions: plan.unsupportedKeywords.slice(0, 8).map((topic) => ({
      topic,
      question: `Can you confirm truthful experience with "${topic}"? If not, prepare an honest gap response.`,
      evidencePaths: [],
    })),
    questionPlan,
    checklist: [
      "Open the original job posting and confirm it is still active.",
      "Choose evidence paths for every candidate claim.",
      "Prepare honest responses for unsupported topics without implying experience.",
      "Ask the interviewer to clarify any ambiguous requirement.",
    ],
    generatedAnswers: false,
    truthVerified: false,
    humanReviewRequired: true,
    stored: false,
  };
}

export function auditInterviewAnswer(resume, question, answer, jobDescription = "") {
  assertValidResume(resume);
  assertText(question, "question", 2_000);
  assertText(answer, "answer", 100_000);
  if (jobDescription !== "") assertText(jobDescription, "jobDescription", 100_000);

  const claimAudit = auditApplicationText(resume, answer, jobDescription);
  const structure = {
    situation: hasSection(answer, ["situation", "situacion", "situación", "context", "contexto"]),
    task: hasSection(answer, ["task", "tarea", "objective", "objetivo"]),
    action: hasSection(answer, ["action", "accion", "acción", "actions", "acciones"]),
    result: hasSection(answer, ["result", "resultado", "outcome", "impacto"]),
  };
  const questionTopics = keywords(question);
  const answerCorpus = normalize(answer);
  const matchedQuestionTopics = questionTopics.filter((topic) => hasTerm(answerCorpus, topic));
  const reviewQuestions = [];
  if (claimAudit.status === "review-required") {
    reviewQuestions.push("Resolve every flagged claim against the confirmed resume or user evidence.");
  }
  if (!structure.action) reviewQuestions.push("State the candidate's own action explicitly.");
  if (!structure.result) reviewQuestions.push("State a truthful result, or say that no measured result is available.");
  if (questionTopics.length > 0 && matchedQuestionTopics.length === 0) {
    reviewQuestions.push("Check that the answer responds directly to the interview question.");
  }

  return {
    status: reviewQuestions.length > 0 ? "review-required" : "review-ready",
    question,
    claimAudit,
    structure,
    questionRelevance: {
      topics: questionTopics,
      matchedTopics: matchedQuestionTopics,
      deterministic: true,
    },
    reviewQuestions,
    truthVerified: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "This audit checks selected text patterns and resume overlap. It cannot prove truth, completeness, or interview quality.",
  };
}

function hasSection(text, labels) {
  const pattern = labels.map(escapeRegExp).join("|");
  return new RegExp(`(?:^|[.!?]\\s+|\\n)\\s*(?:${pattern})\\s*:`, "iu").test(text);
}

function keywords(text) {
  return [...new Set(normalize(text).split(/[^a-z0-9#+]+/).filter(
    (token) => token.length >= 3 && !STOP_WORDS.has(token) && !/^\d+$/.test(token),
  ))];
}

function hasTerm(haystack, term) {
  return ` ${haystack.replace(/[^a-z0-9#+]+/g, " ")} `.includes(` ${term} `);
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .trim();
}

function textOrNull(value, label, maxLength) {
  if (value === undefined || value === null) return null;
  assertText(value, label, maxLength);
  return value.trim();
}

function assertValidResume(resume) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
}

function assertText(value, label, maxLength) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > maxLength) {
    throw new TypeError(`${label} must contain between 1 and ${maxLength} characters`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
