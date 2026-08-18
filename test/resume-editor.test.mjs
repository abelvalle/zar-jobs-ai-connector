import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResumeChanges,
  compareResumeVersions,
} from "../src/resumes/resume-editor.mjs";

const baseResume = {
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

test("applies explicit changes without mutating the base resume", () => {
  const snapshot = structuredClone(baseResume);
  const result = applyResumeChanges(baseResume, [
    {
      operation: "replace",
      path: "basics.summary",
      value: "Backend engineer focused on Java services.",
      source: "user-confirmed",
      note: "Confirmed wording for this application",
    },
    {
      operation: "add",
      path: "skills[0].keywords[2]",
      value: "Java",
      source: "base-resume",
      sourcePath: "skills[0].keywords[0]",
    },
  ]);

  assert.deepEqual(baseResume, snapshot);
  assert.notEqual(result.baseHash, result.variantHash);
  assert.equal(result.variantResume.basics.summary, "Backend engineer focused on Java services.");
  assert.deepEqual(result.variantResume.skills[0].keywords, ["Java", "PostgreSQL", "Java"]);
  assert.equal(result.lineage[1].sourcePath, "skills[0].keywords[0]");
  assert.equal(result.status, "review-required");
  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.stored, false);
});

test("compares versions with stable hashes and field-level differences", () => {
  const variant = structuredClone(baseResume);
  variant.basics.summary = "Backend engineer focused on Java services.";
  variant.skills[0].keywords.push("Kubernetes");

  const first = compareResumeVersions(baseResume, variant);
  const second = compareResumeVersions(baseResume, variant);

  assert.equal(first.baseHash, second.baseHash);
  assert.equal(first.variantHash, second.variantHash);
  assert.equal(first.identical, false);
  assert.ok(first.differences.some((item) => item.path === "basics.summary"));
  assert.ok(first.differences.some((item) => item.path === "skills[0].keywords[2]"));
  assert.ok(first.audit.issues.some((item) => item.value === "Kubernetes"));
});

test("requires exact base evidence for values labelled base-resume", () => {
  assert.throws(
    () => applyResumeChanges(baseResume, [{
      operation: "replace",
      path: "basics.summary",
      value: "Kubernetes expert",
      source: "base-resume",
      sourcePath: "skills[0].keywords[0]",
    }]),
    /does not match sourcePath/,
  );
});

test("rejects unsafe paths and impossible operations", () => {
  assert.throws(
    () => applyResumeChanges(baseResume, [{
      operation: "replace",
      path: "__proto__.polluted",
      value: true,
      source: "user-confirmed",
    }]),
    /forbidden key/,
  );
  assert.throws(
    () => applyResumeChanges(baseResume, [{
      operation: "remove",
      path: "work[9]",
      source: "user-confirmed",
    }]),
    /missing path|index is invalid/,
  );
});
