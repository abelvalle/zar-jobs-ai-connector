import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import JSZip from "jszip";

import {
  ANONYMOUS_EMAIL,
  createAnonymousResume,
  planResumeAnonymization,
  renderAnonymousResumeBundle,
} from "../src/resumes/resume-anonymizer.mjs";
import { renderResumeHtml } from "../src/resumes/resume-tools.mjs";

const resume = {
  basics: {
    name: "Alex Example",
    label: "Backend Engineer",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    url: "https://alex.example",
    image: "https://alex.example/photo.jpg",
    location: { city: "Zaragoza", countryCode: "ES", address: "Private Street" },
    profiles: [{ network: "LinkedIn", url: "https://linkedin.com/in/alex" }],
    summary: "Backend engineer focused on reliable services.",
  },
  work: [{
    name: "Example Tech",
    position: "Backend Engineer",
    url: "https://example.tech/team/alex",
    highlights: ["Reduced deployment time by 30%"],
  }],
  education: [{ institution: "Example University", area: "Computer Science" }],
  projects: [{ name: "Example Platform", description: "Reliable backend platform" }],
  skills: [{ name: "Backend", keywords: ["Java", "PostgreSQL"] }],
};

test("plans path-only anonymization without returning source values", () => {
  const result = planResumeAnonymization(resume);
  const serialized = JSON.stringify(result);

  assert.ok(result.operations.some((item) => item.path === "basics.email"));
  assert.ok(result.operations.some((item) => item.path === "work[0].url"));
  assert.doesNotMatch(serialized, /alex@example\.com|Private Street|linkedin\.com/);
  assert.equal(result.baseResumeModified, false);
  assert.equal(result.anonymityGuaranteed, false);
});

test("creates a contact-safe copy and omits its schema placeholder from HTML", () => {
  const result = createAnonymousResume(resume);
  const html = renderResumeHtml(result.anonymousResume);

  assert.equal(result.anonymousResume.basics.name, "Candidate");
  assert.equal(result.anonymousResume.basics.email, ANONYMOUS_EMAIL);
  assert.equal(result.anonymousResume.basics.phone, undefined);
  assert.equal(result.anonymousResume.basics.location, undefined);
  assert.equal(result.anonymousResume.work[0].name, "Example Tech");
  assert.doesNotMatch(html, /candidate@example\.invalid|alex@example\.com|600 000 000/);
  assert.equal(resume.basics.name, "Alex Example");
});

test("blind-review mode pseudonymizes organizations without changing achievements", () => {
  const result = createAnonymousResume(resume, "blind-review");

  assert.equal(result.anonymousResume.work[0].name, "Employer 1");
  assert.equal(result.anonymousResume.education[0].institution, "Institution 1");
  assert.equal(result.anonymousResume.projects[0].name, "Project 1");
  assert.equal(result.anonymousResume.work[0].highlights[0], "Reduced deployment time by 30%");
  assert.equal(result.factsAdded, false);
});

test("renders a reviewed anonymous ZIP with verified checksums", async () => {
  const result = await renderAnonymousResumeBundle({ resume, mode: "blind-review", template: "technical" });
  const archive = await JSZip.loadAsync(result.buffer);
  assert.deepEqual(Object.keys(archive.files).sort(), [
    "candidate-blind-resume.docx",
    "candidate-blind-resume.json",
    "candidate-blind-resume.pdf",
    "manifest.json",
  ]);
  const manifest = JSON.parse(await archive.file("manifest.json").async("string"));
  assert.equal(manifest.placeholderEmailRendered, false);
  assert.equal(manifest.sourceResumeIncluded, false);
  for (const file of manifest.files) {
    const bytes = await archive.file(file.name).async("nodebuffer");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
  }
  const json = await archive.file("candidate-blind-resume.json").async("string");
  assert.doesNotMatch(json, /Alex Example|Example Tech|Example University/);
});

test("blocks bundles when a direct identifier remains in free text", async () => {
  const unsafe = structuredClone(resume);
  unsafe.basics.summary = "Alex Example builds reliable services.";
  const plan = planResumeAnonymization(unsafe);
  assert.deepEqual(plan.residualIdentifierReferences.map((item) => item.path), ["basics.summary"]);
  await assert.rejects(
    () => renderAnonymousResumeBundle({ resume: unsafe }),
    /direct identifiers remain in free-text fields/,
  );
});

test("rejects unsupported modes and invalid resumes", () => {
  assert.throws(() => planResumeAnonymization(resume, "secret"), /mode must use one of/);
  assert.throws(() => createAnonymousResume({ basics: {} }), /Invalid resume/);
});
