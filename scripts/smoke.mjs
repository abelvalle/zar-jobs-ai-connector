import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CONNECTOR_VERSION } from "../src/connector-status.mjs";

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
const client = new Client({ name: "zar-jobs-smoke", version: CONNECTOR_VERSION });
const smokeResume = {
  basics: {
    name: "Alex Example",
    label: "Backend Engineer",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    summary: "Backend engineer focused on reliable services.",
  },
  work: [
    {
      name: "Example Tech",
      position: "Backend Engineer",
      startDate: "2021-01",
      highlights: ["Built Java services", "Reduced deployment time by 30%"],
    },
  ],
  education: [{ institution: "Example University", area: "Computer Science" }],
  skills: [{ name: "Backend", keywords: ["Java", "PostgreSQL"] }],
};

try {
  await client.connect(transport);

  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map((tool) => tool.name).sort(),
    [
      "audit_resume_variant",
      "check_resume_ats",
      "get_connector_status",
      "get_infojobs_job",
      "get_portal_capabilities",
      "import_indeed_job",
      "import_linkedin_job",
      "import_tecnoempleo_rss",
      "list_tecnoempleo_alert_jobs",
      "match_resume_to_job",
      "normalize_job_url",
      "render_resume_html",
      "render_resume_pdf",
      "search_infojobs_jobs",
      "validate_resume"
    ]
  );

  const status = await client.callTool({
    name: "get_connector_status",
    arguments: {}
  });
  assert.equal(status.isError, undefined);
  assert.equal(status.structuredContent.result.connector.version, CONNECTOR_VERSION);
  assert.equal(status.structuredContent.result.connector.transport, "stdio");
  assert.equal(status.structuredContent.result.portals.length, 4);

  const validatedResume = await client.callTool({
    name: "validate_resume",
    arguments: { resume: smokeResume }
  });
  assert.equal(validatedResume.structuredContent.result.valid, true);

  const renderedResume = await client.callTool({
    name: "render_resume_html",
    arguments: { resume: smokeResume }
  });
  assert.match(renderedResume.structuredContent.result.html, /<!doctype html>/);

  const renderedPdf = await client.callTool({
    name: "render_resume_pdf",
    arguments: { resume: smokeResume, fileName: "example-tech-backend.pdf" }
  });
  const pdfResource = renderedPdf.content.find((item) => item.type === "resource");
  assert.equal(renderedPdf.structuredContent.result.mimeType, "application/pdf");
  assert.equal(renderedPdf.structuredContent.result.stored, false);
  assert.equal(pdfResource.resource.mimeType, "application/pdf");
  assert.match(Buffer.from(pdfResource.resource.blob, "base64").subarray(0, 5).toString("ascii"), /^%PDF-/);

  const atsResume = await client.callTool({
    name: "check_resume_ats",
    arguments: { resume: smokeResume }
  });
  assert.ok(atsResume.structuredContent.result.score >= 80);

  const matchedResume = await client.callTool({
    name: "match_resume_to_job",
    arguments: {
      resume: smokeResume,
      jobDescription: "Backend Engineer with Java, PostgreSQL, and Kubernetes"
    }
  });
  assert.ok(matchedResume.structuredContent.result.missingKeywords.includes("kubernetes"));

  const auditedVariant = await client.callTool({
    name: "audit_resume_variant",
    arguments: { baseResume: smokeResume, variantResume: smokeResume }
  });
  assert.equal(
    auditedVariant.structuredContent.result.status,
    "no-structural-additions-detected"
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
