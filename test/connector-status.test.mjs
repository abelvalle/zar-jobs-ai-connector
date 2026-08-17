import assert from "node:assert/strict";
import test from "node:test";

import { getConnectorStatus } from "../src/connector-status.mjs";

test("reports safe limited modes when optional environment is empty", () => {
  const result = getConnectorStatus({});
  const infoJobs = findPortal(result, "infojobs");
  const tecnoempleo = findPortal(result, "tecnoempleo");

  assert.equal(result.connector.operational, true);
  assert.equal(result.connector.transport, "stdio");
  assert.equal(infoJobs.status, "limited");
  assert.deepEqual(infoJobs.missingVariables, [
    "INFOJOBS_CLIENT_ID",
    "INFOJOBS_CLIENT_SECRET",
  ]);
  assert.equal(tecnoempleo.availableMode, "rss-content-import");
  assert.deepEqual(tecnoempleo.missingVariables, ["TECNOEMPLEO_RSS_URL"]);
  assert.equal(findPortal(result, "linkedin").status, "ready");
  assert.equal(findPortal(result, "indeed").availableMode, "manual-import");
});

test("reports only the missing half of partial InfoJobs configuration", () => {
  const result = getConnectorStatus({ INFOJOBS_CLIENT_ID: "configured-id" });
  const infoJobs = findPortal(result, "infojobs");

  assert.deepEqual(infoJobs.missingVariables, ["INFOJOBS_CLIENT_SECRET"]);
  assert.doesNotMatch(JSON.stringify(result), /configured-id/);
});

test("reports configured network modes without exposing values", () => {
  const result = getConnectorStatus({
    INFOJOBS_CLIENT_ID: "private-id",
    INFOJOBS_CLIENT_SECRET: "private-secret",
    TECNOEMPLEO_RSS_URL: "https://example.invalid/private-rss",
  });

  assert.equal(findPortal(result, "infojobs").status, "ready");
  assert.equal(findPortal(result, "infojobs").availableMode, "official-api");
  assert.equal(findPortal(result, "tecnoempleo").availableMode, "rss-url");
  assert.doesNotMatch(JSON.stringify(result), /private-id|private-secret|private-rss/);
});

test("treats blank environment values as missing", () => {
  const result = getConnectorStatus({
    INFOJOBS_CLIENT_ID: " ",
    INFOJOBS_CLIENT_SECRET: "\t",
  });

  assert.equal(findPortal(result, "infojobs").status, "limited");
});

function findPortal(result, portal) {
  return result.portals.find((item) => item.portal === portal);
}
