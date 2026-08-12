import assert from "node:assert/strict";

import { createTecnoempleoRssClientFromEnv } from "../src/portals/tecnoempleo-rss-client.mjs";

const result = await createTecnoempleoRssClientFromEnv().listJobs({ limit: 1 });

assert.equal(result.source, "tecnoempleo");
assert.ok(Array.isArray(result.jobs));

console.log(
  JSON.stringify({
    status: "ok",
    source: result.source,
    returnedJobs: result.jobs.length,
    receivedItems: result.diagnostics.receivedItems,
    skippedItems: result.diagnostics.skippedItems
  })
);
