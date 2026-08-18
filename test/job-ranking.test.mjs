import assert from "node:assert/strict";
import test from "node:test";

import { compareJobFit, scoreJobFit } from "../src/jobs/job-ranking.mjs";

const preferences = {
  titleKeywords: ["backend engineer", "software engineer"],
  skillKeywords: ["java", "postgresql", "kubernetes"],
  preferredLocations: ["zaragoza", "spain"],
  remotePreference: "remote",
  salaryMinimum: 45_000,
  requiredTerms: ["english"],
  excludedTerms: ["unpaid", "commission only"],
};

test("scores job fit with a deterministic and explainable breakdown", () => {
  const result = scoreJobFit(preferences, {
    title: "Senior Backend Engineer",
    company: "Example Tech",
    location: "Zaragoza, Spain",
    workplaceType: "Remote",
    salaryMinimum: 50_000,
    description: "Build Java and PostgreSQL services in an English-speaking team.",
  });

  assert.equal(result.score, 90);
  assert.equal(result.status, "review-recommended");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.breakdown.title.score, 25);
  assert.equal(result.breakdown.skills.score, 20);
  assert.equal(result.breakdown.workplace.score, 10);
  assert.equal(result.breakdown.salary.score, 10);
  assert.deepEqual(result.breakdown.skills.matched, ["java", "postgresql"]);
  assert.deepEqual(result.breakdown.skills.missing, ["kubernetes"]);
  assert.equal(result.method, "deterministic-weighted-rules-v1");
  assert.equal(result.networkAccess, false);
  assert.equal(result.stored, false);
  assert.equal(result.humanReviewRequired, true);
});

test("caps blocked jobs and reports the exact exclusion evidence", () => {
  const result = scoreJobFit(preferences, {
    title: "Backend Engineer",
    company: "Risky Corp",
    location: "Remote, Spain",
    workplaceType: "Remote",
    salaryMinimum: 60_000,
    description: "English required. This is an unpaid role.",
  });

  assert.equal(result.status, "blocked-by-preference");
  assert.equal(result.score, 39);
  assert.deepEqual(result.blockers, [
    { type: "excluded-term", term: "unpaid", field: "description" },
  ]);
});

test("keeps missing job evidence visible instead of inventing a match", () => {
  const result = scoreJobFit(
    { titleKeywords: ["backend"], salaryMinimum: 50_000 },
    { title: "Backend Engineer", company: "Example Tech" },
  );

  assert.equal(result.score, 71);
  assert.equal(result.breakdown.salary.status, "unknown");
  assert.equal(result.confidence, 50);
  assert.ok(result.reviewQuestions.includes("Confirm the advertised minimum salary."));
});

test("compares jobs without mutating input and uses stable tie breakers", () => {
  const jobs = [
    {
      id: "b",
      title: "Backend Engineer",
      company: "Beta",
      description: "Java",
    },
    {
      id: "a",
      title: "Backend Engineer",
      company: "Alpha",
      description: "Java and PostgreSQL",
    },
  ];
  const snapshot = structuredClone(jobs);
  const result = compareJobFit(
    { titleKeywords: ["backend"], skillKeywords: ["java", "postgresql"] },
    jobs,
  );

  assert.deepEqual(jobs, snapshot);
  assert.equal(result.ranking[0].id, "a");
  assert.equal(result.ranking[0].rank, 1);
  assert.equal(result.ranking[1].id, "b");
  assert.equal(result.decisionMade, false);
  assert.equal(result.humanReviewRequired, true);
});

test("rejects profiles without ranking criteria", () => {
  assert.throws(
    () => scoreJobFit({}, { title: "Backend", company: "Example" }),
    /at least one preference/,
  );
});
