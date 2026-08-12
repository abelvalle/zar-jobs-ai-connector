import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["./src/server.mjs"],
  cwd: root,
  stderr: "pipe"
});
const client = new Client({ name: "zar-jobs-smoke", version: "0.2.0" });

try {
  await client.connect(transport);

  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map((tool) => tool.name).sort(),
    [
      "get_infojobs_job",
      "get_portal_capabilities",
      "normalize_job_url",
      "search_infojobs_jobs"
    ]
  );

  const capabilities = await client.callTool({
    name: "get_portal_capabilities",
    arguments: { portal: "linkedin" }
  });
  assert.equal(capabilities.isError, undefined);
  assert.equal(capabilities.structuredContent.capabilities[0].status, "manual-only");

  const infoJobsCapabilities = await client.callTool({
    name: "get_portal_capabilities",
    arguments: { portal: "infojobs" }
  });
  assert.equal(
    infoJobsCapabilities.structuredContent.capabilities[0].status,
    "implemented-auth-required"
  );

  const normalized = await client.callTool({
    name: "normalize_job_url",
    arguments: {
      url: "https://www.linkedin.com/jobs/view/123456789/?trk=feed"
    }
  });
  assert.equal(normalized.isError, undefined);
  assert.equal(normalized.structuredContent.result.externalId, "123456789");

  console.log("MCP smoke test passed.");
} finally {
  await client.close();
}
