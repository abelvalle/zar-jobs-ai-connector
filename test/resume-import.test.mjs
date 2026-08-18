import assert from "node:assert/strict";
import test from "node:test";

import { reviewResumeImport } from "../src/resumes/resume-import.mjs";

const draftResume = {
  basics: {
    name: "Alex Example",
    label: "Backend Engineer",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    summary: "Backend engineer focused on reliable distributed services",
  },
  work: [
    {
      name: "Example Tech",
      position: "Backend Engineer",
      startDate: "2021-01",
      highlights: ["Built Java services", "Reduced deployment time by 30%"],
    },
  ],
  skills: [{ name: "Backend", keywords: ["Java", "Kubernetes"] }],
};

test("classifies imported draft fields without confirming them", () => {
  const result = reviewResumeImport(
    draftResume,
    [
      "Alex Example",
      "Backend Engineer",
      "alex@example.com | +34 600 000 000",
      "Backend engineer focused on reliable services",
      "Example Tech | 2021-01",
      "Built Java services",
      "Reduced deployment cycles",
      "Skills: Backend, Java",
    ].join("\n"),
    "pdf-extracted",
  );

  assert.equal(result.status, "confirmation-required");
  assert.equal(result.sourceFormat, "pdf-extracted");
  assert.equal(result.draftValid, true);
  assert.equal(result.allFieldsRequireConfirmation, true);
  assert.equal(result.stored, false);
  assert.ok(result.fields.every((field) => field.confirmed === false));
  assert.equal(field(result, "basics.name").support, "exact");
  assert.equal(field(result, "basics.summary").support, "partial");
  assert.equal(field(result, "skills[0].keywords[1]").support, "unmatched");
  assert.ok(result.counts.exact > 0);
  assert.ok(result.counts.partial > 0);
  assert.ok(result.counts.unmatched > 0);
  assert.match(result.disclaimer, /does not parse binary files/);
});

test("returns validation findings for an incomplete draft", () => {
  const result = reviewResumeImport(
    { basics: { name: "Alex Example" } },
    "Alex Example",
    "docx-extracted",
  );

  assert.equal(result.draftValid, false);
  assert.ok(result.draftValidation.errors.some((item) => item.path === "instance.basics.email"));
  assert.equal(result.fields.length, 1);
});

test("rejects missing, oversized, and unknown import sources", () => {
  assert.throws(() => reviewResumeImport(draftResume, ""), /sourceText is required/);
  assert.throws(
    () => reviewResumeImport(draftResume, "x".repeat(200_001)),
    /200,000 character limit/,
  );
  assert.throws(
    () => reviewResumeImport(draftResume, "Alex Example", "binary-pdf"),
    /Unknown resume import format/,
  );
});

function field(result, sourcePath) {
  return result.fields.find((item) => item.sourcePath === sourcePath);
}
