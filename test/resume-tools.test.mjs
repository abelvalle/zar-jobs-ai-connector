import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeResumeAts,
  analyzeResumeJobMatch,
  auditResumeVariant,
  renderResumeHtml,
  validateResume,
} from "../src/resumes/resume-tools.mjs";

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
