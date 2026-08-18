import assert from "node:assert/strict";
import test from "node:test";

import {
  ACHIEVEMENT_SIGNAL_TYPES,
  auditAchievementRewrite,
  planAchievementInterview,
} from "../src/resumes/resume-achievement-coach.mjs";

const resume = {
  basics: { name: "Alex Example", label: "Backend Engineer", email: "alex@example.com" },
  work: [{
    name: "Example Tech",
    position: "Backend Engineer",
    startDate: "2021-01",
    highlights: ["Built Java services", "Reduced deployment time by 30%"],
  }],
  skills: [{ name: "Backend", keywords: ["Java"] }],
};

test("plans deterministic evidence questions for weak achievements", () => {
  const first = planAchievementInterview(resume);
  const second = planAchievementInterview(resume);

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first.items[0].signals), ACHIEVEMENT_SIGNAL_TYPES);
  assert.ok(first.questions.some((item) => item.sourcePath === "work[0].highlights[0]"));
  assert.equal(first.generatedAchievements, false);
  assert.equal(first.metricsInvented, false);
  assert.equal(first.stored, false);
});

test("recognizes confirmed action, scope, and outcome signals", () => {
  const result = planAchievementInterview(resume);
  const quantified = result.items.find((item) => item.currentText.includes("30%"));

  assert.equal(quantified.signals.action, true);
  assert.equal(quantified.signals.scope, true);
  assert.equal(quantified.signals.outcome, true);
  assert.equal(quantified.priority, "ready");
  assert.deepEqual(quantified.questions, []);
});

test("asks role-level questions when a work entry has no highlights", () => {
  const sparse = structuredClone(resume);
  sparse.work[0].highlights = [];
  const result = planAchievementInterview(sparse, { targetRole: "Platform Engineer", maxQuestions: 2 });

  assert.equal(result.targetRole, "Platform Engineer");
  assert.equal(result.questions.length, 2);
  assert.equal(result.items[0].sourcePath, "work[0]");
});

test("flags a proposed metric absent from candidate-confirmed evidence", () => {
  const result = auditAchievementRewrite({
    sourcePath: "work[0].highlights[0]",
    sourceText: "Built Java services",
    confirmedEvidence: ["I supported five services"],
    proposedText: "Built five Java services and reduced incidents by 45%",
  });

  assert.equal(result.status, "review-required");
  assert.ok(result.unsupportedMetrics.includes("45%"));
  assert.equal(result.truthVerified, false);
  assert.equal(result.rewriteApproved, false);
});

test("keeps human confirmation even when every metric is supported", () => {
  const result = auditAchievementRewrite({
    sourcePath: "work[0].highlights[1]",
    sourceText: "Reduced deployment time by 30%",
    confirmedEvidence: ["The measured reduction was 30%"],
    proposedText: "Reduced deployment time by 30% through automation",
  });

  assert.equal(result.status, "human-confirmation-required");
  assert.deepEqual(result.unsupportedMetrics, []);
  assert.equal(result.checks.candidateConfirmationStillRequired, true);
  assert.equal(result.baseResumeModified, false);
});

test("rejects invalid resumes, options, and missing evidence", () => {
  assert.throws(() => planAchievementInterview({ basics: {} }), /Invalid resume/);
  assert.throws(() => planAchievementInterview(resume, { maxQuestions: 21 }), /between 1 and 20/);
  assert.throws(() => planAchievementInterview(resume, { language: "es" }), /Unsupported/);
  assert.throws(() => auditAchievementRewrite({
    sourcePath: "work[0]",
    sourceText: "Built services",
    confirmedEvidence: [],
    proposedText: "Built services",
  }), /confirmedEvidence/);
});
