import assert from "node:assert/strict";
import test from "node:test";

import {
  RECRUITER_REVIEW_DIMENSIONS,
  reviewResumeAsRecruiter,
} from "../src/resumes/resume-recruiter-review.mjs";

const resume = {
  basics: {
    name: "Alex Example",
    label: "Backend Engineer",
    email: "alex@example.com",
    summary: "Backend engineer focused on reliable services, delivery automation, and evidence-based improvements for product teams.",
  },
  work: [{
    name: "Example Tech",
    position: "Backend Engineer",
    startDate: "2021-01",
    highlights: ["Built Java services", "Reduced deployment time by 30%"],
  }],
  projects: [{ name: "Release Service", description: "Internal delivery tooling." }],
  education: [{ institution: "Example University", area: "Computer Science" }],
  skills: [{ name: "Backend", keywords: ["Java", "PostgreSQL"] }],
};

test("returns a deterministic recruiter-style rubric without pretending human review", () => {
  const first = reviewResumeAsRecruiter(resume);
  const second = reviewResumeAsRecruiter(resume);

  assert.deepEqual(first, second);
  assert.equal(first.mode, "general");
  assert.deepEqual(first.rubric.map((item) => item.name), RECRUITER_REVIEW_DIMENSIONS);
  assert.ok(first.overallScore >= 0 && first.overallScore <= 100);
  assert.ok(first.strengths.some((item) => item.code === "quantified-evidence"));
  assert.equal(first.professionalRecruiterReviewPerformed, false);
  assert.equal(first.hiringProbabilityCalculated, false);
  assert.equal(first.protectedTraitsUsed, false);
  assert.equal(first.stored, false);
});

test("flags missing first-pass content and asks only for confirmed evidence", () => {
  const weak = structuredClone(resume);
  delete weak.basics.label;
  delete weak.basics.summary;
  delete weak.work[0].startDate;
  weak.work[0].highlights = [];
  weak.skills = [];

  const result = reviewResumeAsRecruiter(weak);
  const codes = result.priorities.map((item) => item.code);

  assert.ok(codes.includes("missing-headline"));
  assert.ok(codes.includes("missing-summary"));
  assert.ok(codes.includes("missing-role-start-date"));
  assert.ok(codes.includes("missing-achievement-evidence"));
  assert.ok(codes.includes("missing-skills-section"));
  assert.ok(result.questions.every((item) => /confirm/i.test(item.question)));
  assert.equal(result.factsAdded, false);
});

test("adds a targeted evidence view while preserving unsupported terms as gaps", () => {
  const result = reviewResumeAsRecruiter(resume, {
    targetRole: "Platform Engineer",
    jobDescription: "Platform Engineer with Java, PostgreSQL, Kubernetes, Terraform, and reliable services.",
  });

  assert.equal(result.mode, "targeted");
  assert.equal(result.targetRole, "Platform Engineer");
  assert.ok(result.targetMatch.matchedKeywords.includes("java"));
  assert.ok(result.targetMatch.missingKeywords.includes("kubernetes"));
  const gap = result.priorities.find((item) => item.code === "unsupported-target-terms");
  assert.ok(gap.unsupportedTerms.includes("terraform"));
  assert.match(gap.safeAction, /never add/i);
});

test("marks scanability issues without rewriting the resume", () => {
  const crowded = structuredClone(resume);
  crowded.work[0].highlights = Array.from({ length: 7 }, (_, index) => (
    index === 0 ? "A".repeat(241) : `Supported responsibility ${index}`
  ));

  const result = reviewResumeAsRecruiter(crowded);
  const codes = result.priorities.map((item) => item.code);

  assert.ok(codes.includes("long-highlight"));
  assert.ok(codes.includes("crowded-role"));
  assert.equal(result.factsAdded, false);
  assert.deepEqual(crowded.work[0].highlights[0], "A".repeat(241));
});

test("rejects invalid resumes and unsupported options", () => {
  assert.throws(() => reviewResumeAsRecruiter({ basics: {} }), /Invalid resume/);
  assert.throws(() => reviewResumeAsRecruiter(resume, []), /options must be an object/);
  assert.throws(
    () => reviewResumeAsRecruiter(resume, { market: "ES" }),
    /Unsupported recruiter review option/,
  );
  assert.throws(
    () => reviewResumeAsRecruiter(resume, { jobDescription: "x".repeat(100_001) }),
    /jobDescription must contain/,
  );
});
