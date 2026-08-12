import assert from "node:assert/strict";
import test from "node:test";

import { importLinkedInJob } from "../src/portals/linkedin-manual-import.mjs";

test("imports user-provided LinkedIn job data without a network request", () => {
  const result = importLinkedInJob({
    url: "https://www.linkedin.com/jobs/view/123456789/?trk=feed&utm_source=email",
    title: " Backend Engineer ",
    company: " Example Tech ",
    location: "Spain",
    workplaceType: "remote",
    employmentType: "full-time",
    publishedAt: "2026-08-12T10:00:00+02:00",
    description: "External job description"
  });

  assert.deepEqual(result, {
    source: "linkedin",
    externalId: "123456789",
    title: "Backend Engineer",
    company: "Example Tech",
    location: "Spain",
    url: "https://www.linkedin.com/jobs/view/123456789/",
    publishedAt: "2026-08-12T08:00:00.000Z",
    workplaceType: "remote",
    employmentType: "full-time",
    description: "External job description",
    evidence: "user-provided",
    verificationStatus: "unverified",
    safeNextAction:
      "Open the original LinkedIn URL and confirm that the posting is active before acting on it."
  });
});

test("accepts LinkedIn collection URLs with currentJobId", () => {
  const result = importLinkedInJob({
    url: "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=987654321&trk=feed",
    title: "Product Manager",
    company: "Example"
  });

  assert.equal(result.externalId, "987654321");
  assert.equal(
    result.url,
    "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=987654321"
  );
});

test("rejects non-job and non-LinkedIn URLs", () => {
  assert.throws(
    () =>
      importLinkedInJob({
        url: "https://www.linkedin.com/company/example",
        title: "Role",
        company: "Example"
      }),
    /LinkedIn job URL/
  );
  assert.throws(
    () =>
      importLinkedInJob({
        url: "https://jobs.example.com/role/123",
        title: "Role",
        company: "Example"
      }),
    /LinkedIn job URL/
  );
});

test("requires explicit title and company evidence", () => {
  assert.throws(
    () =>
      importLinkedInJob({
        url: "https://www.linkedin.com/jobs/view/123456789/",
        title: "",
        company: "Example"
      }),
    /title/
  );
  assert.throws(
    () =>
      importLinkedInJob({
        url: "https://www.linkedin.com/jobs/view/123456789/",
        title: "Role",
        company: ""
      }),
    /company/
  );
});

test("rejects an invalid publication date", () => {
  assert.throws(
    () =>
      importLinkedInJob({
        url: "https://www.linkedin.com/jobs/view/123456789/",
        title: "Role",
        company: "Example",
        publishedAt: "not-a-date"
      }),
    /publishedAt/
  );
});
