import { auditInterviewAnswer, INTERVIEW_STAGES, planInterview } from "./interview-tools.mjs";
import { validateResume } from "../resumes/resume-tools.mjs";

export const INTERVIEW_SIMULATION_VERSION = 1;
export const INTERVIEW_QUESTION_LIMITS = Object.freeze({ min: 3, max: 10 });

const STAGE_QUESTIONS = Object.freeze({
  general: [
    ["introduction", "Give a concise introduction grounded in your confirmed experience and explain what you want to contribute next."],
    ["evidence", "Which confirmed achievement best represents the value you could bring to this role?"],
    ["questions", "What would you ask to understand the role's real priorities and constraints?"],
  ],
  screening: [
    ["introduction", "Summarize the confirmed experience most relevant to this role without adding missing requirements."],
    ["motivation", "Why are you interested in this role, keeping candidate facts separate from assumptions about the company?"],
    ["conditions", "Which practical role conditions would you need the recruiter to clarify before proceeding?"],
  ],
  recruiter: [
    ["motivation", "Why does this role match your confirmed goals and evidence?"],
    ["achievement", "Describe one confirmed achievement and your own contribution to it."],
    ["transition", "How would you explain your interest in a change without making claims you cannot support?"],
  ],
  technical: [
    ["technical", "Describe a technical decision you made, the alternatives considered, and the confirmed result."],
    ["technical", "Explain how you diagnosed a difficult technical problem using one real example."],
    ["technical", "Describe a trade-off you managed between delivery, reliability, cost, or maintainability."],
  ],
  behavioral: [
    ["behavioral", "Use Situation, Task, Action, and Result to describe how you handled disagreement."],
    ["behavioral", "Use a confirmed example to explain how you acted under ambiguity."],
    ["behavioral", "Describe something you learned from a setback without inventing an outcome."],
  ],
  final: [
    ["impact", "Which confirmed evidence best shows the impact you could bring to this role?"],
    ["priorities", "What would you need to learn before proposing priorities for your first months?"],
    ["questions", "What would you ask the panel before deciding whether the role is a mutual fit?"],
  ],
});

const COMMON_QUESTIONS = Object.freeze([
  ["collaboration", "Describe a confirmed example of collaboration across roles or teams."],
  ["ownership", "Which example best demonstrates your own responsibility rather than the team's general work?"],
  ["learning", "Describe how you learned a skill that appears in your confirmed experience."],
  ["quality", "Give an example of how you protected quality or reliability while delivering work."],
  ["communication", "Explain a complex decision to a non-specialist using a real example."],
  ["prioritization", "Describe a real prioritization decision and the trade-off you made."],
  ["feedback", "Describe how you used feedback to change your approach."],
  ["closing", "What factual point from your experience should the interviewer remember, and why?"],
]);

export function startInterviewSimulation(
  resume,
  jobDescription,
  target = {},
  questionCount = 5,
) {
  assertValidResume(resume);
  assertText(jobDescription, "jobDescription", 100_000);
  assertQuestionCount(questionCount);

  const plan = planInterview(resume, jobDescription, target);
  const defaultEvidencePaths = plan.evidenceCards.slice(0, 3).map((item) => item.sourcePath);
  const candidates = [
    ...STAGE_QUESTIONS[plan.target.stage].map(([category, prompt]) => ({
      category,
      prompt,
      evidencePaths: defaultEvidencePaths,
      source: "stage-template",
    })),
    ...plan.questionPlan.map((question) => ({
      ...question,
      source: "evidence-plan",
    })),
    ...plan.gapQuestions.map((gap) => ({
      category: "gap",
      prompt: `What experience can you truthfully describe with "${gap.topic}"? If none, say so and explain how you would close the gap.`,
      topic: gap.topic,
      evidencePaths: [],
      source: "unverified-gap",
    })),
    ...COMMON_QUESTIONS.map(([category, prompt]) => ({
      category,
      prompt,
      evidencePaths: defaultEvidencePaths,
      source: "common-template",
    })),
  ];
  const questions = uniqueQuestions(candidates).slice(0, questionCount).map((question, index) => ({
    id: `q${index + 1}`,
    ...question,
  }));

  return {
    status: "simulation-ready",
    simulation: {
      version: INTERVIEW_SIMULATION_VERSION,
      mode: "one-question-at-a-time",
      target: plan.target,
      questionCount: questions.length,
      questions,
    },
    supportedTopics: plan.supportedTopics,
    unverifiedGaps: plan.gapQuestions.map((item) => item.topic),
    nextQuestionId: questions[0].id,
    instructions: [
      "Ask exactly one returned question and wait for the candidate's own answer.",
      "Audit each answer before suggesting a revision and keep every claim tied to confirmed evidence.",
      "Say explicitly when the resume does not confirm a requirement.",
    ],
    generatedAnswers: false,
    hiringScoreGenerated: false,
    hiringPredictionGenerated: false,
    recordingPerformed: false,
    networkAccess: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer: "This is structured AI-assisted practice, not a real interviewer or a hiring assessment.",
  };
}

export function reviewInterviewSimulation(resume, jobDescription, simulation, answers = []) {
  assertValidResume(resume);
  assertText(jobDescription, "jobDescription", 100_000);
  const questions = validateSimulation(simulation);
  const normalizedAnswers = validateAnswers(answers, questions);
  const answerByQuestion = new Map(normalizedAnswers.map((item) => [item.questionId, item.answer]));

  const results = questions.map((question) => {
    const answer = answerByQuestion.get(question.id);
    if (answer === undefined) {
      return {
        questionId: question.id,
        question: question.prompt,
        status: "pending",
        audit: null,
      };
    }
    const audit = auditInterviewAnswer(resume, question.prompt, answer, jobDescription);
    return {
      questionId: question.id,
      question: question.prompt,
      status: audit.status,
      audit,
    };
  });
  const answeredResults = results.filter((item) => item.audit !== null);
  const reviewRequired = answeredResults.filter((item) => item.status === "review-required").length;
  const pending = results.length - answeredResults.length;

  return {
    status: pending > 0 ? "in-progress" : reviewRequired > 0 ? "review-required" : "review-ready",
    summary: {
      totalQuestions: questions.length,
      answered: answeredResults.length,
      pending,
      reviewRequired,
      reviewReady: answeredResults.length - reviewRequired,
      starCoverage: Object.fromEntries(
        ["situation", "task", "action", "result"].map((part) => [
          part,
          answeredResults.filter((item) => item.audit.structure[part]).length,
        ]),
      ),
    },
    results,
    nextQuestionId: results.find((item) => item.status === "pending")?.questionId ?? null,
    generatedAnswers: false,
    hiringScoreGenerated: false,
    hiringPredictionGenerated: false,
    recordingPerformed: false,
    networkAccess: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "Counts describe this practice session only. They do not measure employability, interview quality, or hiring probability.",
  };
}

function uniqueQuestions(questions) {
  const seen = new Set();
  return questions.filter((question) => {
    const key = question.prompt.trim().toLocaleLowerCase("en");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateSimulation(simulation) {
  if (!isPlainObject(simulation) || simulation.version !== INTERVIEW_SIMULATION_VERSION) {
    throw new TypeError(`simulation.version must be ${INTERVIEW_SIMULATION_VERSION}`);
  }
  if (!Array.isArray(simulation.questions)
    || simulation.questions.length < INTERVIEW_QUESTION_LIMITS.min
    || simulation.questions.length > INTERVIEW_QUESTION_LIMITS.max) {
    throw new TypeError("simulation.questions must contain between 3 and 10 questions");
  }
  const ids = new Set();
  return simulation.questions.map((question, index) => {
    if (!isPlainObject(question)) throw new TypeError(`simulation.questions[${index}] must be an object`);
    assertText(question.id, `simulation.questions[${index}].id`, 50);
    assertText(question.prompt, `simulation.questions[${index}].prompt`, 2_000);
    assertText(question.category, `simulation.questions[${index}].category`, 100);
    if (ids.has(question.id)) throw new TypeError(`Duplicate question id: ${question.id}`);
    ids.add(question.id);
    return question;
  });
}

function validateAnswers(answers, questions) {
  if (!Array.isArray(answers) || answers.length > questions.length) {
    throw new TypeError("answers must be an array no longer than the question list");
  }
  const questionIds = new Set(questions.map((item) => item.id));
  const answerIds = new Set();
  return answers.map((item, index) => {
    if (!isPlainObject(item)) throw new TypeError(`answers[${index}] must be an object`);
    assertText(item.questionId, `answers[${index}].questionId`, 50);
    assertText(item.answer, `answers[${index}].answer`, 100_000);
    if (!questionIds.has(item.questionId)) throw new TypeError(`Unknown question id: ${item.questionId}`);
    if (answerIds.has(item.questionId)) throw new TypeError(`Duplicate answer for question id: ${item.questionId}`);
    answerIds.add(item.questionId);
    return { questionId: item.questionId, answer: item.answer.trim() };
  });
}

function assertQuestionCount(value) {
  if (!Number.isInteger(value)
    || value < INTERVIEW_QUESTION_LIMITS.min
    || value > INTERVIEW_QUESTION_LIMITS.max) {
    throw new TypeError("questionCount must be an integer between 3 and 10");
  }
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
