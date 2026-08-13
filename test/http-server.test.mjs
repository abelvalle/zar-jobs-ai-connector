import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { startZarJobsHttpServer } from "../src/http-server.mjs";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>My alert</title><item>
<guid>te-remote-1</guid><title>Backend Engineer</title>
<link>https://www.tecnoempleo.com/ofertas-trabajo/backend-engineer/example</link>
<author>Example Tech</author></item></channel></rss>`;

test("serves the public stateless MCP over Streamable HTTP", async () => {
  const server = await startZarJobsHttpServer({ port: 0 });
  const address = server.address();
  assert.ok(typeof address === "object" && address !== null);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: "ok",
    service: "zar-jobs-ai-connector",
    version: "0.6.0",
  });

  const client = new Client({ name: "zar-jobs-http-test", version: "0.6.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const toolNames = listed.tools.map((tool) => tool.name);
    assert.ok(toolNames.includes("import_tecnoempleo_rss"));
    assert.ok(toolNames.includes("import_linkedin_job"));
    assert.ok(toolNames.includes("import_indeed_job"));
    assert.ok(!toolNames.includes("search_infojobs_jobs"));
    assert.ok(!toolNames.includes("list_tecnoempleo_alert_jobs"));

    const capabilities = await client.callTool({
      name: "get_portal_capabilities",
      arguments: { portal: "tecnoempleo" },
    });
    assert.equal(capabilities.structuredContent.capabilities[0].status, "implemented-rss-import");

    const imported = await client.callTool({
      name: "import_tecnoempleo_rss",
      arguments: { rssXml: RSS_FIXTURE },
    });
    assert.equal(imported.isError, undefined);
    assert.equal(imported.structuredContent.result.jobs[0].externalId, "te-remote-1");

    const importedIndeed = await client.callTool({
      name: "import_indeed_job",
      arguments: {
        url: "https://es.indeed.com/viewjob?jk=abc123def4567890&from=share",
        title: "Backend Engineer",
        company: "Example Tech",
      },
    });
    assert.equal(importedIndeed.isError, undefined);
    assert.equal(importedIndeed.structuredContent.result.externalId, "abc123def4567890");
  } finally {
    await client.close();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("rejects unsupported methods and unrecognized hosts", async () => {
  const server = await startZarJobsHttpServer({
    port: 0,
    allowedHosts: ["connector.example.com"],
  });
  const address = server.address();
  assert.ok(typeof address === "object" && address !== null);
  const endpoint = `http://127.0.0.1:${address.port}/mcp`;

  try {
    const wrongHostStatus = await requestStatus(
      endpoint,
      {
        method: "POST",
        headers: {
          host: "attacker.example.com",
          "content-type": "application/json",
          "content-length": "2",
        },
      },
      "{}",
    );
    assert.equal(wrongHostStatus, 421);

    const wrongMethodStatus = await requestStatus(endpoint, {
      headers: { host: "connector.example.com" },
    });
    assert.equal(wrongMethodStatus, 405);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

function requestStatus(url, options, body) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, options, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    request.once("error", reject);
    if (body) request.write(body);
    request.end();
  });
}
