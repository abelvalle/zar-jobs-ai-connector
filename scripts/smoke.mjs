import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portable = process.argv.includes("--portable");
const execFileAsync = promisify(execFile);
const portableDirectory = portable
  ? await mkdtemp(path.join(os.tmpdir(), "zar-jobs-portable-"))
  : null;
const portableArchive = portable ? await packPortableArchive(portableDirectory) : null;
const transport = new StdioClientTransport(
  portable
    ? {
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: ["--yes", "--package", portableArchive, "zar-jobs-ai-connector"],
        cwd: root,
        stderr: "pipe"
      }
    : {
        command: process.execPath,
        args: ["./src/cli.mjs"],
        cwd: root,
        stderr: "pipe"
      }
);
const client = new Client({ name: "zar-jobs-smoke", version: "0.7.0" });

try {
  await client.connect(transport);

  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map((tool) => tool.name).sort(),
    [
      "get_infojobs_job",
      "get_portal_capabilities",
      "import_indeed_job",
      "import_linkedin_job",
      "import_tecnoempleo_rss",
      "list_tecnoempleo_alert_jobs",
      "normalize_job_url",
      "search_infojobs_jobs"
    ]
  );

  const capabilities = await client.callTool({
    name: "get_portal_capabilities",
    arguments: { portal: "linkedin" }
  });
  assert.equal(capabilities.isError, undefined);
  assert.equal(
    capabilities.structuredContent.capabilities[0].status,
    "implemented-manual-import"
  );

  const infoJobsCapabilities = await client.callTool({
    name: "get_portal_capabilities",
    arguments: { portal: "infojobs" }
  });
  assert.equal(
    infoJobsCapabilities.structuredContent.capabilities[0].status,
    "implemented-auth-required"
  );

  const tecnoempleoCapabilities = await client.callTool({
    name: "get_portal_capabilities",
    arguments: { portal: "tecnoempleo" }
  });
  assert.equal(
    tecnoempleoCapabilities.structuredContent.capabilities[0].status,
    "implemented-user-rss-required"
  );

  const normalized = await client.callTool({
    name: "normalize_job_url",
    arguments: {
      url: "https://www.linkedin.com/jobs/view/123456789/?trk=feed"
    }
  });
  assert.equal(normalized.isError, undefined);
  assert.equal(normalized.structuredContent.result.externalId, "123456789");

  const imported = await client.callTool({
    name: "import_linkedin_job",
    arguments: {
      url: "https://www.linkedin.com/jobs/view/123456789/?trk=feed",
      title: "Backend Engineer",
      company: "Example Tech"
    }
  });
  assert.equal(imported.isError, undefined);
  assert.equal(imported.structuredContent.result.verificationStatus, "unverified");

  const indeedCapabilities = await client.callTool({
    name: "get_portal_capabilities",
    arguments: { portal: "indeed" }
  });
  assert.equal(
    indeedCapabilities.structuredContent.capabilities[0].status,
    "implemented-manual-import"
  );

  const importedIndeed = await client.callTool({
    name: "import_indeed_job",
    arguments: {
      url: "https://es.indeed.com/viewjob?jk=abc123def4567890&from=shareddesktop_copy",
      title: "Backend Engineer",
      company: "Example Tech"
    }
  });
  assert.equal(importedIndeed.isError, undefined);
  assert.equal(importedIndeed.structuredContent.result.externalId, "abc123def4567890");

  console.log("MCP smoke test passed.");
} finally {
  await client.close();
  if (portableArchive) {
    await unlink(portableArchive);
    await rmdir(portableDirectory);
  }
}

async function packPortableArchive(destination) {
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, "Run the portable smoke test through npm.");
  const { stdout } = await execFileAsync(
    process.execPath,
    [npmCli, "pack", "--silent", "--pack-destination", destination],
    { cwd: root }
  );
  const filename = stdout.trim().split(/\r?\n/).at(-1);
  assert.ok(filename?.endsWith(".tgz"));
  return path.join(destination, filename);
}
