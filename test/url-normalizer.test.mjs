import assert from "node:assert/strict";
import test from "node:test";

import { normalizeJobUrl } from "../src/portals/url-normalizer.mjs";

test("normalizes a LinkedIn job URL and extracts its ID", () => {
  const result = normalizeJobUrl(
    "https://www.linkedin.com/jobs/view/123456789/?trk=feed&utm_source=email#details"
  );

  assert.equal(result.portal, "linkedin");
  assert.equal(result.externalId, "123456789");
  assert.equal(result.url, "https://www.linkedin.com/jobs/view/123456789/");
});

test("preserves functional query parameters", () => {
  const result = normalizeJobUrl(
    "https://www.infojobs.net/job/example?offerId=abc&utm_campaign=digest"
  );

  assert.equal(result.portal, "infojobs");
  assert.equal(result.url, "https://www.infojobs.net/job/example?offerId=abc");
});

test("marks unknown HTTPS domains as unsupported", () => {
  const result = normalizeJobUrl("https://jobs.example.com/role/42");
  assert.equal(result.portal, "unknown");
  assert.equal(result.supported, false);
});

test("rejects non-HTTPS URLs", () => {
  assert.throws(
    () => normalizeJobUrl("http://www.tecnoempleo.com/oferta/123"),
    /Only HTTPS/
  );
});

test("rejects embedded credentials", () => {
  assert.throws(
    () => normalizeJobUrl("https://user:secret@www.infojobs.net/job/example"),
    /must not contain credentials/
  );
});
