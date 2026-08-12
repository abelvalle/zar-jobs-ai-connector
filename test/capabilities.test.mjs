import assert from "node:assert/strict";
import test from "node:test";

import { getPortalCapabilities } from "../src/portals/capabilities.mjs";

test("returns all documented portals", () => {
  const result = getPortalCapabilities();
  assert.deepEqual(
    result.map((item) => item.portal),
    ["infojobs", "tecnoempleo", "linkedin"]
  );
});

test("filters a single portal", () => {
  const result = getPortalCapabilities("linkedin");
  assert.equal(result.length, 1);
  assert.equal(result[0].status, "manual-only");
  assert.ok(result[0].unavailableNow.includes("scraping"));
});

test("reports the implemented read-only InfoJobs tools", () => {
  const [result] = getPortalCapabilities("infojobs");
  assert.equal(result.status, "implemented-auth-required");
  assert.ok(result.availableNow.includes("job-search"));
  assert.ok(result.availableNow.includes("job-detail"));
  assert.ok(result.unavailableNow.includes("application-submission"));
});

test("reports the user-authorized Tecnoempleo RSS capability", () => {
  const [result] = getPortalCapabilities("tecnoempleo");
  assert.equal(result.status, "implemented-user-rss-required");
  assert.ok(result.availableNow.includes("alert-job-listing"));
  assert.ok(result.unavailableNow.includes("general-api-search"));
});

test("rejects an unknown portal", () => {
  assert.throws(() => getPortalCapabilities("example"), /Unsupported portal/);
});
