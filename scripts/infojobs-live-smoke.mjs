import assert from "node:assert/strict";

import { createInfoJobsClientFromEnv } from "../src/portals/infojobs-client.mjs";

const query = process.argv.slice(2).join(" ").trim() || "software";
const result = await createInfoJobsClientFromEnv().searchOffers({
  query,
  maxResults: 1
});

assert.equal(result.source, "infojobs");
assert.ok(Array.isArray(result.jobs));
assert.ok(result.pagination.currentPage === null || result.pagination.currentPage >= 1);

console.log(
  JSON.stringify({
    status: "ok",
    source: result.source,
    returnedJobs: result.jobs.length,
    totalResults: result.pagination.totalResults
  })
);
