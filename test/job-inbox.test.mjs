import assert from "node:assert/strict";
import test from "node:test";

import {
  compareJobSnapshots,
  importJobAlert,
} from "../src/jobs/job-inbox.mjs";

test("imports generic RSS and Atom alerts without network access", () => {
  const rss = importJobAlert(`<?xml version="1.0"?>
    <rss><channel><title>Backend jobs</title><item>
      <guid>rss-1</guid><title>Backend Engineer</title><author>Example Tech</author>
      <link>https://jobs.example.org/backend?utm_source=alert</link>
      <location>Zaragoza</location><description>Java role</description>
    </item></channel></rss>`, { format: "rss", sourceLabel: "personal-rss" });
  const atom = importJobAlert(`<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom"><title>Platform jobs</title><entry>
      <id>atom-1</id><title>Platform Engineer</title><author><name>Second Corp</name></author>
      <link href="https://jobs.example.org/platform"/><summary>Cloud role</summary>
    </entry></feed>`, { format: "atom" });

  assert.equal(rss.jobs[0].url, "https://jobs.example.org/backend");
  assert.equal(rss.jobs[0].company, "Example Tech");
  assert.equal(atom.jobs[0].externalId, "atom-1");
  assert.equal(atom.jobs[0].company, "Second Corp");
  assert.equal(rss.networkAccess, false);
  assert.equal(atom.stored, false);
});

test("imports JSON, CSV, and labelled text alerts into one contract", () => {
  const json = importJobAlert(JSON.stringify({ jobs: [{
    id: "json-1",
    title: "Data Engineer",
    company: "Data Corp",
    url: "https://jobs.example.org/data",
  }] }), { format: "json" });
  const csv = importJobAlert(
    'external_id,title,company,location,url,description\n"csv-1","Product, Engineer","CSV Corp","Remote","https://jobs.example.org/product","Build, test"',
    { format: "csv" },
  );
  const text = importJobAlert(
    "Title: Security Engineer\nCompany: Safe Corp\nLocation: Madrid\nURL: https://jobs.example.org/security\nDescription: Review systems",
    { format: "text" },
  );

  assert.equal(json.jobs[0].title, "Data Engineer");
  assert.equal(csv.jobs[0].title, "Product, Engineer");
  assert.equal(csv.jobs[0].description, "Build, test");
  assert.equal(text.jobs[0].company, "Safe Corp");
  assert.ok([json, csv, text].every((result) =>
    result.jobs[0].verificationStatus === "unverified"));
});

test("skips incomplete rows and reports diagnostics", () => {
  const result = importJobAlert(JSON.stringify([
    { title: "Missing company" },
    { title: "Complete", company: "Example" },
  ]), { format: "json" });

  assert.equal(result.diagnostics.receivedItems, 2);
  assert.equal(result.diagnostics.returnedItems, 1);
  assert.equal(result.diagnostics.skippedItems, 1);
});

test("compares snapshots with exact identities and deterministic repost evidence", () => {
  const previous = [
    { id: "a-old", source: "alert", externalId: "1", title: "Backend Engineer", company: "Example", location: "Remote", description: "Java" },
    { id: "removed", source: "alert", externalId: "2", title: "Platform Engineer", company: "Old Corp", location: "Madrid" },
    { id: "repost-old", source: "alert", externalId: "3", title: "Data Engineer", company: "Data Corp", location: "Spain" },
  ];
  const current = [
    { id: "a-new", source: "alert", externalId: "1", title: "Backend Engineer", company: "Example", location: "Remote", description: "Java and PostgreSQL" },
    { id: "added", source: "alert", externalId: "4", title: "Frontend Engineer", company: "New Corp", location: "Remote" },
    { id: "repost-new", source: "alert", externalId: "5", title: "Data Engineer", company: "Data Corp", location: "Spain" },
  ];

  const result = compareJobSnapshots(previous, current);

  assert.equal(result.added.length, 2);
  assert.equal(result.removed.length, 2);
  assert.equal(result.changed.length, 1);
  assert.deepEqual(result.changed[0].changedFields, ["description"]);
  assert.equal(result.reposts.length, 1);
  assert.equal(result.reposts[0].previousId, "repost-old");
  assert.equal(result.reposts[0].currentId, "repost-new");
  assert.equal(result.fuzzyMatching, false);
  assert.equal(result.stored, false);
});

test("supports an empty first snapshot", () => {
  const result = compareJobSnapshots([], [{
    id: "first",
    title: "Backend Engineer",
    company: "Example",
  }]);

  assert.equal(result.previousUniqueJobs, 0);
  assert.equal(result.added.length, 1);
});

test("does not infer a repost when location evidence is absent", () => {
  const result = compareJobSnapshots(
    [{ source: "alert", externalId: "old", title: "Backend", company: "Example" }],
    [{ source: "alert", externalId: "new", title: "Backend", company: "Example" }],
  );

  assert.equal(result.reposts.length, 0);
});

test("rejects unsupported formats, oversized content, and malformed CSV", () => {
  assert.throws(() => importJobAlert("x", { format: "html" }), /format must be one of/);
  assert.throws(
    () => importJobAlert("x".repeat(2_000_001), { format: "text" }),
    /2 MB safety limit/,
  );
  assert.throws(
    () => importJobAlert('title,company\n"broken,Example', { format: "csv" }),
    /unterminated quoted field/,
  );
});
