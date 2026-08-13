import assert from "node:assert/strict";
import test from "node:test";

import { importIndeedJob } from "../src/portals/indeed-manual-import.mjs";

test("imports user-provided Indeed job data without a network request", () => {
  const result = importIndeedJob({
    url: "https://es.indeed.com/viewjob?jk=abc123def4567890&from=shareddesktop_copy",
    title: " Backend Engineer ",
    company: " Example Tech ",
    location: "Spain",
    workplaceType: "remote",
    employmentType: "full-time",
    publishedAt: "2026-08-13T10:00:00+02:00",
    description: "External job description",
  });

  assert.deepEqual(result, {
    source: "indeed",
    externalId: "abc123def4567890",
    title: "Backend Engineer",
    company: "Example Tech",
    location: "Spain",
    url: "https://es.indeed.com/viewjob?jk=abc123def4567890",
    publishedAt: "2026-08-13T08:00:00.000Z",
    workplaceType: "remote",
    employmentType: "full-time",
    description: "External job description",
    evidence: "user-provided",
    verificationStatus: "unverified",
    safeNextAction:
      "Open the original Indeed URL and confirm that the posting is active before acting on it.",
  });
});

test("rejects non-job and non-Indeed URLs", () => {
  assert.throws(
    () =>
      importIndeedJob({
        url: "https://es.indeed.com/jobs?q=backend",
        title: "Role",
        company: "Example",
      }),
    /Indeed viewjob URL/,
  );
  assert.throws(
    () =>
      importIndeedJob({
        url: "https://jobs.example.com/viewjob?jk=abc123def4567890",
        title: "Role",
        company: "Example",
      }),
    /Indeed viewjob URL/,
  );
});

test("requires a valid job key, title, and company", () => {
  assert.throws(
    () =>
      importIndeedJob({
        url: "https://es.indeed.com/viewjob?jk=short",
        title: "Role",
        company: "Example",
      }),
    /valid jk job key/,
  );
  assert.throws(
    () =>
      importIndeedJob({
        url: "https://es.indeed.com/viewjob?jk=abc123def4567890",
        title: "",
        company: "Example",
      }),
    /title/,
  );
  assert.throws(
    () =>
      importIndeedJob({
        url: "https://es.indeed.com/viewjob?jk=abc123def4567890",
        title: "Role",
        company: "",
      }),
    /company/,
  );
});

test("rejects an invalid publication date", () => {
  assert.throws(
    () =>
      importIndeedJob({
        url: "https://es.indeed.com/viewjob?jk=abc123def4567890",
        title: "Role",
        company: "Example",
        publishedAt: "not-a-date",
      }),
    /publishedAt/,
  );
});
