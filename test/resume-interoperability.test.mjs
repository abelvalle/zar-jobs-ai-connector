import assert from "node:assert/strict";
import test from "node:test";

import { renderResumeHtml } from "../src/resumes/resume-tools.mjs";
import {
  buildEvidenceBank,
  matchResumeEvidence,
  prepareEuropassMapping,
  prepareResumeLocale,
} from "../src/resumes/resume-interoperability.mjs";
import { resumeSectionLabels } from "../src/resumes/resume-labels.mjs";

const resume = {
  basics: {
    name: "Alex Example",
    label: "Backend Engineer",
    email: "alex@example.com",
    summary: "Backend engineer focused on reliable services.",
    location: { city: "Zaragoza", countryCode: "ES" },
  },
  work: [{
    name: "Example Tech",
    position: "Backend Engineer",
    startDate: "2021-01",
    highlights: ["Built Java services", "Reduced deployment time by 30%"],
  }],
  education: [{
    institution: "Example University",
    area: "Computer Science",
    studyType: "Degree",
  }],
  skills: [{ name: "Backend", keywords: ["Java", "PostgreSQL"] }],
  languages: [{ language: "Spanish", fluency: "Native" }],
};

test("localizes document labels without pretending to translate resume facts", () => {
  const result = prepareResumeLocale(resume, "fr-FR");
  const html = renderResumeHtml(result.localizedResume);

  assert.equal(result.localizedResume.meta.language, "fr-FR");
  assert.equal(result.localizedResume.work[0].name, "Example Tech");
  assert.equal(result.contentTranslated, false);
  assert.ok(result.translationReviewPaths.includes("basics.summary"));
  assert.match(html, /Expérience professionnelle/);
  assert.match(html, /Compétences/);
  assert.equal(resumeSectionLabels("de-DE").work, "Berufserfahrung");
});

test("prepares a traceable Europass mapping draft with honest compatibility flags", () => {
  const result = prepareEuropassMapping(resume, "es-ES");

  assert.equal(result.format, "zar-jobs-europass-mapping-draft-v1");
  assert.equal(result.compatibility.officialEuropassImport, false);
  assert.equal(result.compatibility.europeanDigitalCredential, false);
  assert.equal(result.loginPerformed, false);
  assert.equal(result.mapping.workExperiences[0].employer, "Example Tech");
  assert.equal(result.mapping.workExperiences[0].sourcePath, "work[0]");
  assert.ok(result.officialSources.every((url) => url.startsWith("https://europass.europa.eu/")));
  assert.equal(result.stored, false);
});

test("builds a deterministic evidence bank from validated resume paths", () => {
  const first = buildEvidenceBank(resume);
  const second = buildEvidenceBank(resume);

  assert.deepEqual(first, second);
  assert.ok(first.items.some((item) => item.sourcePath === "work[0].highlights[1]"));
  assert.ok(first.items.find((item) => item.sourcePath === "work[0].highlights[1]").metrics.includes("30%"));
  assert.match(first.bankHash, /^[a-f0-9]{64}$/);
  assert.equal(first.factsAdded, false);
});

test("matches evidence to a job and leaves unsupported topics as gaps", () => {
  const result = matchResumeEvidence(
    resume,
    "Backend Engineer with Java, PostgreSQL, Kubernetes, and reliable services.",
  );

  assert.ok(result.supportedTopics.includes("java"));
  assert.ok(result.supportedTopics.includes("postgresql"));
  assert.ok(result.unsupportedTopics.includes("kubernetes"));
  assert.ok(result.matches.every((item) => item.sourcePath && item.evidenceId));
  assert.equal(result.humanReviewRequired, true);
});

test("rejects unsupported locales and invalid resumes", () => {
  assert.throws(() => prepareResumeLocale(resume, "ja-JP"), /locale must use one of/);
  assert.throws(() => buildEvidenceBank({ basics: {} }), /Invalid resume/);
});
