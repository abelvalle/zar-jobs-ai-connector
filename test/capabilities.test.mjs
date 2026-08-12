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

test("rejects an unknown portal", () => {
  assert.throws(() => getPortalCapabilities("example"), /Unsupported portal/);
});
