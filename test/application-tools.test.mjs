import assert from "node:assert/strict";
import test from "node:test";

import {
  auditApplicationText,
  planCoverLetter,
  planScreeningAnswers,
  prepareApplicationKit,
} from "../src/applications/application-tools.mjs";

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
const jobDescription = "Example Corp seeks a Backend Engineer with Java, PostgreSQL, and Kubernetes.";

test("plans a cover letter from traceable resume evidence", () => {
  const result = planCoverLetter(resume, jobDescription, {
    company: "Example Corp",
    role: "Backend Engineer",
  });

  assert.equal(result.generatedText, false);
  assert.ok(result.evidence.some((item) => item.sourcePath === "skills[0]"));
  assert.ok(result.unsupportedKeywords.includes("kubernetes"));
  assert.ok(result.outline.find((item) => item.section === "fit").evidencePaths.length > 0);
  assert.equal(result.stored, false);
});

test("plans screening answers without generating them", () => {
  const result = planScreeningAnswers(resume, [
    "Describe your Java experience.",
    "How many years have you used Kubernetes?",
  ]);

  assert.equal(result.generatedAnswers, false);
  assert.equal(result.questions.length, 2);
  assert.ok(result.questions[0].evidence.length > 0);
  assert.equal(result.questions[1].needsUserInput, true);
});

test("flags unsupported application claims and preserves supported metrics", () => {
  const unsupported = auditApplicationText(
    resume,
    "I increased revenue by 75% and I am a Kubernetes expert.",
    jobDescription,
  );
  const supported = auditApplicationText(
    resume,
    "I reduced deployment time by 30% while building Java services.",
    jobDescription,
  );

  assert.equal(unsupported.status, "review-required");
  assert.ok(unsupported.sentences[0].unsupportedNumbers.includes("75%"));
  assert.equal(supported.status, "no-selected-unsupported-claims-detected");
  assert.ok(supported.sentences[0].evidence.some(
    (item) => item.sourcePath === "work[0].highlights[1]",
  ));
});

test("prepares a local kit manifest that can never submit an application", () => {
  const result = prepareApplicationKit({
    resume,
    jobDescription,
    target: { company: "Example Corp", role: "Backend Engineer" },
    coverLetter: "I increased revenue by 75%.",
    screeningAnswers: [{
      question: "Describe your Java experience.",
      answer: "I built Java services.",
    }],
    template: "technical",
  });

  assert.equal(result.status, "review-required");
  assert.equal(result.suggestedFiles.resumePdf, "example-corp-backend-engineer.pdf");
  assert.equal(result.suggestedFiles.resumeDocx, "example-corp-backend-engineer.docx");
  assert.deepEqual(result.nextTools, ["render_resume_pdf", "render_resume_docx"]);
  assert.equal(result.finalApprovalRequired, true);
  assert.equal(result.submissionPerformed, false);
  assert.equal(result.stored, false);
});
