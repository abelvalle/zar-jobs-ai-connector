import assert from "node:assert/strict";
import test from "node:test";

import {
  auditInterviewAnswer,
  planInterview,
} from "../src/interviews/interview-tools.mjs";

const resume = {
  basics: {
    name: "Alex Example",
    email: "alex@example.com",
    summary: "Backend engineer focused on reliable services.",
  },
  work: [{
    name: "Example Tech",
    position: "Backend Engineer",
    highlights: ["Built Java services", "Reduced deployment time by 30%"],
  }],
  skills: [{ name: "Backend", keywords: ["Java", "PostgreSQL"] }],
};

test("plans interview preparation from traceable resume evidence", () => {
  const result = planInterview(
    resume,
    "Example Corp seeks a Backend Engineer with Java, PostgreSQL, and Kubernetes.",
    { company: "Example Corp", role: "Backend Engineer", stage: "technical" },
  );

  assert.equal(result.target.stage, "technical");
  assert.equal(result.generatedAnswers, false);
  assert.ok(result.evidenceCards.every((item) => item.sourcePath));
  assert.ok(result.supportedTopics.includes("java"));
  assert.ok(result.gapQuestions.some((item) => item.topic === "kubernetes"));
  assert.ok(result.questionPlan.some((item) => item.category === "technical"));
  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.stored, false);
});

test("audits a supported STAR-style answer without claiming proof of truth", () => {
  const result = auditInterviewAnswer(
    resume,
    "Tell me about a delivery improvement.",
    "Situation: deployments were slow. Task: improve delivery. Action: I changed the service workflow. Result: I reduced deployment time by 30%.",
    "Backend role focused on reliable delivery.",
  );

  assert.equal(result.claimAudit.status, "no-selected-unsupported-claims-detected");
  assert.deepEqual(result.structure, {
    situation: true,
    task: true,
    action: true,
    result: true,
  });
  assert.equal(result.status, "review-ready");
  assert.equal(result.truthVerified, false);
});

test("flags unsupported answer metrics and missing STAR elements", () => {
  const result = auditInterviewAnswer(
    resume,
    "What impact did you have?",
    "I increased revenue by 75%.",
  );

  assert.equal(result.status, "review-required");
  assert.ok(result.claimAudit.sentences[0].unsupportedNumbers.includes("75%"));
  assert.equal(result.structure.action, false);
  assert.equal(result.structure.result, false);
  assert.ok(result.reviewQuestions.length > 0);
});

test("rejects unsupported stages and empty answers", () => {
  assert.throws(
    () => planInterview(resume, "Java role", { stage: "automatic-hire" }),
    /stage must be one of/,
  );
  assert.throws(
    () => auditInterviewAnswer(resume, "Question", ""),
    /answer must contain/,
  );
});
