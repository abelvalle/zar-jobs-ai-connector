import assert from "node:assert/strict";
import test from "node:test";

import { getPortalCapabilities } from "../src/portals/capabilities.mjs";

test("returns all documented portals", () => {
  const result = getPortalCapabilities();
  assert.deepEqual(
    result.map((item) => item.portal),
    ["infojobs", "tecnoempleo", "linkedin", "indeed"]
  );
});

test("filters a single portal", () => {
  const result = getPortalCapabilities("linkedin");
  assert.equal(result.length, 1);
  assert.equal(result[0].status, "implemented-manual-import");
  assert.ok(result[0].availableNow.includes("manual-job-import"));
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
  assert.ok(result.unavailableNow.includes("automated-general-search"));
});

test("reports Indeed manual import without automated access", () => {
  const [result] = getPortalCapabilities("indeed");
  assert.equal(result.status, "implemented-manual-import");
  assert.ok(result.availableNow.includes("manual-job-import"));
  assert.ok(result.unavailableNow.includes("automated-search"));
  assert.ok(result.unavailableNow.includes("scraping"));
});

test("rejects an unknown portal", () => {
  assert.throws(() => getPortalCapabilities("example"), /Unsupported portal/);
});
