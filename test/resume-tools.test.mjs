import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  analyzeResumeAts,
  analyzeResumeJobMatch,
  auditResumeVariant,
  planResumeVariant,
  RESUME_TEMPLATES,
  renderResumeHtml,
  validateResume,
} from "../src/resumes/resume-tools.mjs";
import { renderResumePdf } from "../src/resumes/resume-pdf.mjs";
import { renderResumeDocx } from "../src/resumes/resume-docx.mjs";

const baseResume = {
  meta: { language: "es-ES" },
  basics: {
    name: "Alex Example",
    label: "Backend Engineer",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    summary: "Ingeniero backend especializado en servicios fiables.",
    location: { city: "Zaragoza", countryCode: "ES" },
    profiles: [],
  },
  work: [
    {
      name: "Example Tech",
      position: "Backend Engineer",
      startDate: "2021-01",
      endDate: "2025-06",
      highlights: [
        "Redujo el tiempo de despliegue un 30%",
        "Desarrolló servicios con Java y PostgreSQL",
      ],
    },
  ],
  education: [
    {
      institution: "Example University",
      area: "Computer Science",
      studyType: "Degree",
      endDate: "2020-06",
    },
  ],
  skills: [
    { name: "Backend", keywords: ["Java", "PostgreSQL", "REST APIs"] },
  ],
  projects: [
    {
      name: "Release Service",
      description: "Servicio interno para automatizar despliegues.",
      highlights: ["Mejoró la trazabilidad de entregas"],
    },
  ],
  certificates: [],
  languages: [{ language: "Spanish", fluency: "Native" }],
};

test("validates a complete JSON Resume document", () => {
  const result = validateResume(baseResume);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.standard, "JSON Resume 1.x");
});

test("requires identity and at least one evidence section", () => {
  const result = validateResume({ basics: {} });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path === "instance.basics.name"));
  assert.ok(result.errors.some((error) => error.path === "instance.basics.email"));
  assert.ok(result.errors.some((error) => error.path === "instance"));
});

test("renders escaped single-column HTML and produces a strong structural ATS score", () => {
  const resume = structuredClone(baseResume);
  resume.basics.summary = "Backend engineer <script>alert('x')</script>";
  const html = renderResumeHtml(resume);
  const result = analyzeResumeAts(resume);

  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Experiencia profesional/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<table|grid-template-columns|column-count/);
  assert.ok(result.score >= 80, `expected ATS score >= 80, got ${result.score}`);
  assert.match(result.disclaimer, /no external ATS result is guaranteed/);
});

test("compares resume evidence with a job description without adding claims", () => {
  const result = analyzeResumeJobMatch(
    baseResume,
    "Buscamos Backend Engineer con Java, PostgreSQL, Kubernetes y observabilidad.",
  );

  assert.ok(result.matchedSkills.includes("Java"));
  assert.ok(result.matchedSkills.includes("PostgreSQL"));
  assert.ok(result.missingKeywords.includes("kubernetes"));
  assert.equal(result.reviewRequired, true);
});

test("plans a variant with traceable existing evidence", () => {
  const result = planResumeVariant(
    baseResume,
    "Backend Engineer con Java, PostgreSQL, Kubernetes y automatización de despliegues.",
  );

  assert.equal(result.status, "plan-ready");
  assert.equal(result.humanReviewRequired, true);
  assert.ok(result.supportedKeywords.includes("java"));
  assert.ok(result.unsupportedKeywords.includes("kubernetes"));
  assert.ok(result.evidence.some((item) => item.sourcePath === "work[0].highlights[1]"));
  assert.ok(result.evidence.every((item) => item.text && item.sourcePath));
  assert.ok(result.reviewQuestions.some((item) => item.keyword === "kubernetes"));
  assert.match(result.disclaimer, /does not create candidate facts/);
});

test("rejects variant planning for an invalid base resume", () => {
  assert.throws(
    () => planResumeVariant({ basics: {} }, "Backend Engineer"),
    /Invalid resume/,
  );
});

test("accepts a reordered variant that introduces no selected factual additions", () => {
  const variant = structuredClone(baseResume);
  variant.skills[0].keywords.reverse();
  variant.basics.summary = "Backend Engineer con experiencia en servicios y despliegues.";
  const result = auditResumeVariant(baseResume, variant);

  assert.equal(result.status, "no-structural-additions-detected");
  assert.equal(result.humanReviewRequired, true);
  assert.deepEqual(result.issues, []);
});

test("flags new employers, skills, metrics, and identity changes in a variant", () => {
  const variant = structuredClone(baseResume);
  variant.basics.email = "different@example.com";
  variant.work.push({
    name: "Unknown Corp",
    position: "CTO",
    startDate: "2025-07",
    highlights: ["Aumentó ingresos un 90%"],
  });
  variant.skills[0].keywords.push("Kubernetes");
  const result = auditResumeVariant(baseResume, variant);

  assert.equal(result.status, "review-required");
  assert.ok(result.issues.some((issue) => issue.field === "work employer"));
  assert.ok(result.issues.some((issue) => issue.field === "skill"));
  assert.ok(result.issues.some((issue) => issue.field === "numeric claim"));
  assert.ok(result.issues.some((issue) => issue.field === "basics.email"));
});

test("renders a portable PDF with extractable resume text", async () => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const result = await renderResumePdf(baseResume, "example-tech-backend.pdf");
  const loadingTask = getDocument({
    data: new Uint8Array(result.buffer),
    standardFontDataUrl: fileURLToPath(
      new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url),
    ).replaceAll("\\", "/"),
  });
  const document = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  await document.destroy();

  assert.equal(result.mimeType, "application/pdf");
  assert.equal(result.fileName, "example-tech-backend.pdf");
  assert.equal(result.stored, false);
  assert.match(result.buffer.subarray(0, 5).toString("ascii"), /^%PDF-/);
  assert.equal(result.pages, document.numPages);
  assert.match(pages.join(" "), /Alex Example/);
  assert.match(pages.join(" "), /Example Tech/);
  assert.match(pages.join(" "), /Java/);
});

test("rejects paths and non-PDF names for portable output", async () => {
  await assert.rejects(
    renderResumePdf(baseResume, "../resume.pdf"),
    /plain PDF filename/,
  );
  await assert.rejects(
    renderResumePdf(baseResume, "resume.txt"),
    /plain PDF filename/,
  );
});

test("renders editable DOCX files with extractable text in every template", async () => {
  const mammoth = await import("mammoth");

  for (const template of RESUME_TEMPLATES) {
    const result = await renderResumeDocx(
      baseResume,
      `${template}-resume.docx`,
      template,
    );
    const extracted = await mammoth.extractRawText({ buffer: result.buffer });

    assert.equal(result.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(result.fileName, `${template}-resume.docx`);
    assert.equal(result.template, template);
    assert.equal(result.stored, false);
    assert.equal(result.buffer.subarray(0, 2).toString("ascii"), "PK");
    assert.match(extracted.value, /Alex Example/);
    assert.match(extracted.value, /Example Tech/);
    assert.match(extracted.value, /Java/);
  }
});

test("rejects paths, non-DOCX names, and unknown DOCX templates", async () => {
  await assert.rejects(
    renderResumeDocx(baseResume, "../resume.docx"),
    /plain DOCX filename/,
  );
  await assert.rejects(
    renderResumeDocx(baseResume, "resume.pdf"),
    /plain DOCX filename/,
  );
  await assert.rejects(
    renderResumeDocx(baseResume, "resume.docx", "decorative"),
    /Unknown resume template/,
  );
});

test("keeps all ATS templates single-column and text-extractable", async () => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  for (const template of RESUME_TEMPLATES) {
    const html = renderResumeHtml(baseResume, template);
    const ats = analyzeResumeAts(baseResume, template);
    const pdf = await renderResumePdf(baseResume, `${template}-resume.pdf`, template);
    const loadingTask = getDocument({
      data: new Uint8Array(pdf.buffer),
      standardFontDataUrl: fileURLToPath(
        new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url),
      ).replaceAll("\\", "/"),
    });
    const document = await loadingTask.promise;
    const page = await document.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    await document.destroy();

    assert.match(html, new RegExp(`data-template="${template}"`));
    assert.doesNotMatch(html, /<table|grid-template-columns|column-count/);
    assert.ok(ats.score >= 80, `${template} ATS score was ${ats.score}`);
    assert.equal(ats.template, template);
    assert.equal(pdf.template, template);
    assert.match(text, /Alex Example/);
    assert.match(text, /Example Tech/);
    assert.match(text, /Java/);
  }
});

test("rejects unknown resume templates", async () => {
  assert.throws(() => renderResumeHtml(baseResume, "decorative"), /Unknown resume template/);
  await assert.rejects(
    renderResumePdf(baseResume, "resume.pdf", "decorative"),
    /Unknown resume template/,
  );
});
