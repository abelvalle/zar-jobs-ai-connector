import assert from "node:assert/strict";
import test from "node:test";

import { analyzeApplicationFunnel } from "../src/tracking/application-analytics.mjs";

const records = [
  {
    id: "app-1",
    company: "Alpha",
    role: "Backend Engineer",
    status: "interview",
    createdAt: "2026-07-01",
    appliedAt: "2026-07-02",
    respondedAt: "2026-07-05",
    interviewAt: "2026-07-10",
    sourcePortal: "infojobs",
    resumeVariant: "backend-v1",
    fitScore: 88,
  },
  {
    id: "app-2",
    company: "Beta",
    role: "Backend Engineer",
    status: "offer",
    createdAt: "2026-07-02",
    appliedAt: "2026-07-03",
    respondedAt: "2026-07-07",
    interviewAt: "2026-07-12",
    offerAt: "2026-07-20",
    sourcePortal: "linkedin",
    resumeVariant: "backend-v2",
    fitScore: 78,
  },
  {
    id: "app-3",
    company: "Gamma",
    role: "Platform Engineer",
    status: "rejected",
    createdAt: "2026-07-03",
    appliedAt: "2026-07-04",
    respondedAt: "2026-07-08",
    interviewAt: "2026-07-15",
    rejectedAt: "2026-07-20",
    sourcePortal: "infojobs",
    resumeVariant: "backend-v1",
    fitScore: 62,
  },
  {
    id: "app-4",
    company: "Delta",
    role: "Backend Engineer",
    status: "saved",
    createdAt: "2026-07-05",
  },
];

test("calculates an evidence-based funnel and explicit response timing", () => {
  const result = analyzeApplicationFunnel(records, "2026-08-19");

  assert.deepEqual(result.overall.counts, {
    total: 4,
    applied: 3,
    responded: 3,
    interviewed: 3,
    offered: 1,
    hired: 0,
    rejected: 1,
  });
  assert.equal(result.overall.rates.offerPerApplied, 0.3333);
  assert.equal(result.timing.explicitResponseSamples, 3);
  assert.equal(result.timing.medianDaysToResponse, 4);
  assert.equal(result.causalAnalysisPerformed, false);
});

test("segments portal, role, variant, and fit without ranking small samples", () => {
  const result = analyzeApplicationFunnel(records, "2026-08-19");
  const infojobs = result.segments.portal.find((item) => item.value === "infojobs");
  const highFit = result.segments.fitBand.find((item) => item.value === "85-100");

  assert.equal(infojobs.counts.applied, 2);
  assert.equal(infojobs.counts.interviewed, 2);
  assert.equal(infojobs.comparisonEligible, false);
  assert.equal(infojobs.sampleStatus, "insufficient-applied-sample");
  assert.equal(highFit.counts.applied, 1);
  assert.equal(result.rankingPerformed, false);
});

test("preserves historical stages for a currently rejected application", () => {
  const result = analyzeApplicationFunnel([records[2]], "2026-08-19", ["portal"]);

  assert.equal(result.overall.counts.responded, 1);
  assert.equal(result.overall.counts.interviewed, 1);
  assert.equal(result.overall.counts.rejected, 1);
});

test("reports missing analytical dimensions instead of inventing them", () => {
  const result = analyzeApplicationFunnel([records[3]], "2026-08-19");

  assert.equal(result.overall.counts.applied, 0);
  assert.equal(result.overall.rates.responsePerApplied, null);
  assert.equal(result.dataQuality.missingAppliedAt, 1);
  assert.equal(result.dataQuality.unknownPortal, 1);
  assert.equal(result.dataQuality.unknownResumeVariant, 1);
  assert.equal(result.dataQuality.unknownFitScore, 1);
});

test("rejects duplicate ids, future evidence, invalid scores, and groups", () => {
  assert.throws(
    () => analyzeApplicationFunnel([records[0], records[0]], "2026-08-19"),
    /duplicate application id/,
  );
  const future = { ...records[0], respondedAt: "2026-08-20" };
  assert.throws(
    () => analyzeApplicationFunnel([future], "2026-08-19"),
    /respondedAt cannot be after asOf/,
  );
  assert.throws(
    () => analyzeApplicationFunnel([{ ...records[0], fitScore: 101 }], "2026-08-19"),
    /fitScore must be between 0 and 100/,
  );
  assert.throws(
    () => analyzeApplicationFunnel(records, "2026-08-19", ["company"]),
    /Unsupported analytics group/,
  );
});
