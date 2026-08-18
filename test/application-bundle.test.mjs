import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import JSZip from "jszip";

import {
  auditResumePrivacy,
  renderApplicationBundle,
} from "../src/applications/application-bundle.mjs";

const resume = {
  basics: {
    name: "Alex Example",
    label: "Backend Engineer",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    summary: "Backend engineer focused on reliable services.",
    location: { city: "Zaragoza", countryCode: "ES" },
  },
  work: [{
    name: "Example Tech",
    position: "Backend Engineer",
    highlights: ["Built Java services", "Reduced deployment time by 30%"],
  }],
  skills: [{ name: "Backend", keywords: ["Java", "PostgreSQL"] }],
};

test("audits privacy paths without returning sensitive values", () => {
  const risky = structuredClone(resume);
  risky.basics.dateOfBirth = "1990-01-01";
  risky.basics.nationalId = "12345678Z";
  risky.basics.image = "https://example.org/photo.jpg?utm_source=cv";
  risky.basics.location.address = "Private Street 123";

  const result = auditResumePrivacy(risky);
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "review-required");
  assert.ok(result.findings.some((item) => item.type === "national-identifier"));
  assert.ok(result.findings.some((item) => item.type === "date-of-birth"));
  assert.ok(result.findings.some((item) => item.type === "photo-or-image"));
  assert.ok(result.findings.some((item) => item.type === "full-address"));
  assert.ok(result.findings.some((item) => item.type === "tracking-parameters"));
  assert.doesNotMatch(serialized, /12345678Z|Private Street 123|1990-01-01/);
  assert.ok(result.contactFields.some((item) => item.path === "basics.email"));
  assert.equal(result.stored, false);
});

test("renders a reviewed PDF and DOCX application ZIP entirely in memory", async () => {
  const result = await renderApplicationBundle({
    resume,
    jobDescription: "Example Corp seeks a Backend Engineer with Java.",
    target: { company: "Example Corp", role: "Backend Engineer" },
    template: "technical",
    coverLetter: "I built Java services at Example Tech.",
    screeningAnswers: [{
      question: "Describe your Java experience.",
      answer: "I built Java services at Example Tech.",
    }],
  });

  assert.equal(result.mimeType, "application/zip");
  assert.equal(result.fileName, "example-corp-backend-engineer-application.zip");
  assert.equal(result.stored, false);
  assert.equal(result.submissionPerformed, false);
  assert.equal(result.finalApprovalRequired, true);
  assert.ok(result.buffer.length > 0);
  assert.equal(result.buffer.subarray(0, 2).toString("ascii"), "PK");

  const archive = await JSZip.loadAsync(result.buffer);
  const names = Object.keys(archive.files).sort();
  assert.deepEqual(names, [
    "example-corp-backend-engineer-cover-letter.txt",
    "example-corp-backend-engineer.docx",
    "example-corp-backend-engineer.pdf",
    "manifest.json",
    "screening-answers.json",
  ]);
  const manifest = JSON.parse(await archive.file("manifest.json").async("string"));
  assert.equal(manifest.finalApprovalRequired, true);
  assert.equal(manifest.submissionPerformed, false);
  assert.equal(manifest.files.length, 4);
  for (const file of manifest.files) {
    const bytes = await archive.file(file.name).async("nodebuffer");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
  }
});

test("keeps privacy findings in the bundle manifest", async () => {
  const risky = structuredClone(resume);
  risky.basics.image = "https://example.org/photo.jpg";

  const result = await renderApplicationBundle({
    resume: risky,
    jobDescription: "Backend Engineer with Java.",
    target: { company: "Example Corp", role: "Backend Engineer" },
  });

  assert.equal(result.status, "review-required");
  assert.ok(result.manifest.privacy.findings.some((item) => item.path === "basics.image"));
});

test("rejects invalid bundle targets", async () => {
  await assert.rejects(
    () => renderApplicationBundle({
      resume,
      jobDescription: "Backend Engineer",
      target: { company: "Example Corp", role: "../secret" },
    }),
    /target.role contains unsupported characters/,
  );
});
