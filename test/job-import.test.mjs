import assert from "node:assert/strict";
import test from "node:test";

import { fingerprintJobs, reviewJobImport } from "../src/jobs/job-import.mjs";

test("reviews job text from an arbitrary portal without network access", () => {
  const result = reviewJobImport(
    "Example Tech busca Backend Engineer en Zaragoza. Trabajo remoto con Java y PostgreSQL.",
    {
      title: "Backend Engineer",
      company: "Example Tech",
      location: "Zaragoza",
      workplaceType: "Remoto",
      employmentType: "Jornada completa",
      description: "Java, PostgreSQL y Kubernetes",
      url: "https://jobs.example.org/backend?utm_source=mail",
    },
    "jobs.example.org",
  );

  assert.equal(result.status, "confirmation-required");
  assert.equal(result.job.url, "https://jobs.example.org/backend");
  assert.equal(result.job.portal, "unknown");
  assert.equal(result.networkAccess, false);
  assert.equal(result.stored, false);
  assert.equal(result.verificationStatus, "unverified");
  assert.ok(result.fields.every((field) => field.confirmed === false));
  assert.equal(result.fields.find((field) => field.field === "title").support, "exact");
  assert.equal(result.fields.find((field) => field.field === "description").support, "partial");
});

test("returns validation errors instead of trusting an incomplete job draft", () => {
  const result = reviewJobImport("Backend Engineer", { title: "Backend Engineer" });

  assert.deepEqual(result.validationErrors, [{ field: "company", message: "is required" }]);
  assert.equal(result.humanReviewRequired, true);
});

test("fingerprints exact duplicates deterministically", () => {
  const jobs = [
    { id: "a", source: "linkedin", externalId: "123", title: "Backend", company: "Example" },
    { id: "b", source: "LinkedIn", externalId: "123", title: "Different title", company: "Other" },
    { id: "c", title: "Backend Engineer", company: "Example Tech", location: "Zaragoza" },
    { id: "d", title: " backend engineer ", company: "EXAMPLE TECH", location: "zaragoza" },
  ];
  const first = fingerprintJobs(jobs);
  const second = fingerprintJobs(jobs);

  assert.deepEqual(first, second);
  assert.equal(first.duplicateGroups.length, 2);
  assert.equal(first.duplicateCount, 2);
  assert.equal(first.fuzzyMatching, false);
  assert.equal(first.stored, false);
});

test("rejects unsafe URLs and incomplete fingerprint identity", () => {
  assert.throws(
    () => reviewJobImport("Backend", { url: "https://user:secret@example.org/job" }),
    /must not contain credentials/,
  );
  assert.throws(
    () => fingerprintJobs([{ title: "Backend" }]),
    /requires title and company/,
  );
});
