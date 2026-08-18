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
  await client.connect(transport, { timeout: portable ? 180_000 : 60_000 });

  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map((tool) => tool.name).sort(),
    [
      "apply_resume_changes",
      "audit_application_text",
      "audit_interview_answer",
      "audit_resume_privacy",
      "audit_resume_variant",
      "check_resume_ats",
      "compare_job_fit",
      "compare_job_snapshots",
      "compare_resume_versions",
      "export_followup_calendar",
      "fingerprint_jobs",
      "get_connector_status",
      "get_infojobs_job",
      "get_portal_capabilities",
      "import_indeed_job",
      "import_job_alert",
      "import_linkedin_job",
      "import_tecnoempleo_rss",
      "list_tecnoempleo_alert_jobs",
      "match_resume_to_job",
      "normalize_job_url",
      "plan_application_update",
      "plan_cover_letter",
      "plan_interview",
      "plan_resume_variant",
      "plan_screening_answers",
      "prepare_application_kit",
      "render_application_bundle",
      "render_resume_docx",
      "render_resume_html",
      "render_resume_pdf",
      "review_application_tracker",
      "review_job_import",
      "review_resume_import",
      "score_job_fit",
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
    arguments: { resume: smokeResume, template: "compact" }
  });
  assert.match(renderedResume.structuredContent.result.html, /<!doctype html>/);
  assert.equal(renderedResume.structuredContent.result.template, "compact");

  const renderedPdf = await client.callTool({
    name: "render_resume_pdf",
    arguments: {
      resume: smokeResume,
      fileName: "example-tech-backend.pdf",
      template: "technical"
    }
  });
  const pdfResource = renderedPdf.content.find((item) => item.type === "resource");
  assert.equal(renderedPdf.structuredContent.result.mimeType, "application/pdf");
  assert.equal(renderedPdf.structuredContent.result.template, "technical");
  assert.equal(renderedPdf.structuredContent.result.stored, false);
  assert.equal(pdfResource.resource.mimeType, "application/pdf");
  assert.match(Buffer.from(pdfResource.resource.blob, "base64").subarray(0, 5).toString("ascii"), /^%PDF-/);

  const renderedDocx = await client.callTool({
    name: "render_resume_docx",
    arguments: {
      resume: smokeResume,
      fileName: "example-tech-backend.docx",
      template: "technical"
    }
  });
  const docxResource = renderedDocx.content.find((item) => item.type === "resource");
  assert.equal(
    renderedDocx.structuredContent.result.mimeType,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  assert.equal(renderedDocx.structuredContent.result.template, "technical");
  assert.equal(renderedDocx.structuredContent.result.stored, false);
  assert.equal(docxResource.resource.mimeType, renderedDocx.structuredContent.result.mimeType);
  assert.equal(Buffer.from(docxResource.resource.blob, "base64").subarray(0, 2).toString("ascii"), "PK");

  const atsResume = await client.callTool({
    name: "check_resume_ats",
    arguments: { resume: smokeResume, template: "technical" }
  });
  assert.ok(atsResume.structuredContent.result.score >= 80);
  assert.equal(atsResume.structuredContent.result.template, "technical");

  const matchedResume = await client.callTool({
    name: "match_resume_to_job",
    arguments: {
      resume: smokeResume,
      jobDescription: "Backend Engineer with Java, PostgreSQL, and Kubernetes"
    }
  });
  assert.ok(matchedResume.structuredContent.result.missingKeywords.includes("kubernetes"));

  const variantPlan = await client.callTool({
    name: "plan_resume_variant",
    arguments: {
      resume: smokeResume,
      jobDescription: "Backend Engineer with Java, PostgreSQL, and Kubernetes"
    }
  });
  assert.ok(variantPlan.structuredContent.result.supportedKeywords.includes("java"));
  assert.ok(variantPlan.structuredContent.result.unsupportedKeywords.includes("kubernetes"));
  assert.ok(variantPlan.structuredContent.result.evidence.every((item) => item.sourcePath));

  const importReview = await client.callTool({
    name: "review_resume_import",
    arguments: {
      resume: smokeResume,
      sourceFormat: "pdf-extracted",
      sourceText:
        "Alex Example Backend Engineer alex@example.com +34 600 000 000 Example Tech Built Java services",
    }
  });
  assert.equal(importReview.structuredContent.result.status, "confirmation-required");
  assert.equal(importReview.structuredContent.result.stored, false);
  assert.ok(importReview.structuredContent.result.fields.every((item) => item.confirmed === false));

  const auditedVariant = await client.callTool({
    name: "audit_resume_variant",
    arguments: { baseResume: smokeResume, variantResume: smokeResume }
  });
  assert.equal(
    auditedVariant.structuredContent.result.status,
    "no-structural-additions-detected"
  );

  const editedVariant = await client.callTool({
    name: "apply_resume_changes",
    arguments: {
      baseResume: smokeResume,
      changes: [{
        operation: "replace",
        path: "basics.summary",
        value: "Backend engineer focused on Java services.",
        source: "user-confirmed"
      }]
    }
  });
  assert.equal(editedVariant.structuredContent.result.status, "review-required");
  assert.notEqual(
    editedVariant.structuredContent.result.baseHash,
    editedVariant.structuredContent.result.variantHash
  );

  const comparedVariant = await client.callTool({
    name: "compare_resume_versions",
    arguments: {
      baseResume: smokeResume,
      variantResume: editedVariant.structuredContent.result.variantResume
    }
  });
  assert.ok(comparedVariant.structuredContent.result.differences.some(
    (item) => item.path === "basics.summary"
  ));

  const coverPlan = await client.callTool({
    name: "plan_cover_letter",
    arguments: {
      resume: smokeResume,
      jobDescription: "Example Corp seeks a Backend Engineer with Java and Kubernetes.",
      target: { company: "Example Corp", role: "Backend Engineer" }
    }
  });
  assert.equal(coverPlan.structuredContent.result.generatedText, false);
  assert.ok(coverPlan.structuredContent.result.evidence.every((item) => item.sourcePath));

  const screeningPlan = await client.callTool({
    name: "plan_screening_answers",
    arguments: {
      resume: smokeResume,
      questions: ["Describe your Java experience."]
    }
  });
  assert.equal(screeningPlan.structuredContent.result.generatedAnswers, false);
  assert.ok(screeningPlan.structuredContent.result.questions[0].evidence.length > 0);

  const applicationAudit = await client.callTool({
    name: "audit_application_text",
    arguments: {
      resume: smokeResume,
      applicationText: "I increased revenue by 75%.",
      jobDescription: "Example Corp seeks a Backend Engineer."
    }
  });
  assert.equal(applicationAudit.structuredContent.result.status, "review-required");

  const applicationKit = await client.callTool({
    name: "prepare_application_kit",
    arguments: {
      resume: smokeResume,
      jobDescription: "Example Corp seeks a Backend Engineer with Java.",
      target: { company: "Example Corp", role: "Backend Engineer" },
      template: "technical"
    }
  });
  assert.equal(applicationKit.structuredContent.result.finalApprovalRequired, true);
  assert.equal(applicationKit.structuredContent.result.submissionPerformed, false);
  assert.deepEqual(
    applicationKit.structuredContent.result.nextTools,
    ["render_resume_pdf", "render_resume_docx"]
  );

  const privacyAudit = await client.callTool({
    name: "audit_resume_privacy",
    arguments: { resume: smokeResume }
  });
  assert.equal(privacyAudit.structuredContent.result.valuesReturned, false);
  assert.equal(privacyAudit.structuredContent.result.stored, false);

  const applicationBundle = await client.callTool({
    name: "render_application_bundle",
    arguments: {
      resume: smokeResume,
      jobDescription: "Example Corp seeks a Backend Engineer with Java.",
      target: { company: "Example Corp", role: "Backend Engineer" },
      coverLetter: "I built Java services at Example Tech.",
      template: "technical"
    }
  });
  const bundleResource = applicationBundle.content.find((item) => item.type === "resource");
  assert.equal(applicationBundle.structuredContent.result.submissionPerformed, false);
  assert.equal(applicationBundle.structuredContent.result.finalApprovalRequired, true);
  assert.equal(bundleResource.resource.mimeType, "application/zip");
  assert.equal(Buffer.from(bundleResource.resource.blob, "base64").subarray(0, 2).toString("ascii"), "PK");

  const interviewPlan = await client.callTool({
    name: "plan_interview",
    arguments: {
      resume: smokeResume,
      jobDescription: "Example Corp seeks a Backend Engineer with Java and Kubernetes.",
      target: { company: "Example Corp", role: "Backend Engineer", stage: "technical" }
    }
  });
  assert.equal(interviewPlan.structuredContent.result.generatedAnswers, false);
  assert.ok(interviewPlan.structuredContent.result.gapQuestions.some(
    (item) => item.topic === "kubernetes"
  ));

  const interviewAudit = await client.callTool({
    name: "audit_interview_answer",
    arguments: {
      resume: smokeResume,
      question: "What result did you achieve?",
      answer: "Result: I increased revenue by 75%."
    }
  });
  assert.equal(interviewAudit.structuredContent.result.status, "review-required");
  assert.equal(interviewAudit.structuredContent.result.truthVerified, false);

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

  const reviewedGenericJob = await client.callTool({
    name: "review_job_import",
    arguments: {
      sourceLabel: "jobs.example.org",
      sourceText: "Example Tech seeks a Backend Engineer in Zaragoza with Java.",
      job: {
        title: "Backend Engineer",
        company: "Example Tech",
        location: "Zaragoza",
        url: "https://jobs.example.org/backend?utm_source=email"
      }
    }
  });
  assert.equal(reviewedGenericJob.structuredContent.result.job.portal, "unknown");
  assert.equal(reviewedGenericJob.structuredContent.result.networkAccess, false);
  assert.ok(reviewedGenericJob.structuredContent.result.fields.every(
    (field) => field.confirmed === false
  ));

  const fingerprintedJobs = await client.callTool({
    name: "fingerprint_jobs",
    arguments: {
      jobs: [
        { source: "indeed", externalId: "abc123" },
        { source: "Indeed", externalId: "abc123" }
      ]
    }
  });
  assert.equal(fingerprintedJobs.structuredContent.result.duplicateCount, 1);
  assert.equal(fingerprintedJobs.structuredContent.result.fuzzyMatching, false);

  const importedAlert = await client.callTool({
    name: "import_job_alert",
    arguments: {
      format: "csv",
      sourceLabel: "personal-alert",
      content: "external_id,title,company,url\nalert-1,Backend Engineer,Example Tech,https://jobs.example.org/backend"
    }
  });
  assert.equal(importedAlert.structuredContent.result.jobs[0].source, "personal-alert");
  assert.equal(importedAlert.structuredContent.result.networkAccess, false);

  const comparedSnapshots = await client.callTool({
    name: "compare_job_snapshots",
    arguments: {
      previousJobs: [{
        source: "personal-alert",
        externalId: "alert-1",
        title: "Backend Engineer",
        company: "Example Tech",
        description: "Java"
      }],
      currentJobs: [{
        source: "personal-alert",
        externalId: "alert-1",
        title: "Backend Engineer",
        company: "Example Tech",
        description: "Java and PostgreSQL"
      }]
    }
  });
  assert.deepEqual(comparedSnapshots.structuredContent.result.changed[0].changedFields, ["description"]);
  assert.equal(comparedSnapshots.structuredContent.result.fuzzyMatching, false);

  const scoredJob = await client.callTool({
    name: "score_job_fit",
    arguments: {
      preferences: {
        titleKeywords: ["backend"],
        skillKeywords: ["java", "postgresql"],
        remotePreference: "remote"
      },
      job: {
        title: "Backend Engineer",
        company: "Example Tech",
        workplaceType: "Remote",
        description: "Java and PostgreSQL"
      }
    }
  });
  assert.equal(scoredJob.structuredContent.result.score, 100);
  assert.equal(scoredJob.structuredContent.result.decisionMade, false);

  const comparedJobs = await client.callTool({
    name: "compare_job_fit",
    arguments: {
      preferences: { titleKeywords: ["backend"], skillKeywords: ["java"] },
      jobs: [
        { id: "frontend", title: "Frontend Engineer", company: "Example", description: "CSS" },
        { id: "backend", title: "Backend Engineer", company: "Example", description: "Java" }
      ]
    }
  });
  assert.equal(comparedJobs.structuredContent.result.ranking[0].id, "backend");
  assert.equal(comparedJobs.structuredContent.result.humanReviewRequired, true);

  const trackerRecords = [{
    id: "app-001",
    company: "Example Tech",
    role: "Backend Engineer",
    status: "applied",
    createdAt: "2026-08-01",
    appliedAt: "2026-08-02",
    nextActionAt: "2026-08-20"
  }];
  const trackerReview = await client.callTool({
    name: "review_application_tracker",
    arguments: { records: trackerRecords, asOf: "2026-08-18" }
  });
  assert.equal(trackerReview.structuredContent.result.metrics.active, 1);
  assert.equal(trackerReview.structuredContent.result.followUps.upcoming[0].id, "app-001");

  const trackerUpdate = await client.callTool({
    name: "plan_application_update",
    arguments: {
      records: trackerRecords,
      asOf: "2026-08-18",
      update: {
        id: "app-001",
        changes: { status: "interview", nextActionAt: "2026-08-25" }
      }
    }
  });
  assert.equal(trackerUpdate.structuredContent.result.updatedRecord.status, "interview");
  assert.equal(trackerUpdate.structuredContent.result.writePerformed, false);

  const followupCalendar = await client.callTool({
    name: "export_followup_calendar",
    arguments: { records: trackerRecords, asOf: "2026-08-18" }
  });
  const calendarResource = followupCalendar.content.find((item) => item.type === "resource");
  assert.equal(followupCalendar.structuredContent.result.events, 1);
  assert.equal(calendarResource.resource.mimeType, "text/calendar");
  assert.match(calendarResource.resource.text, /BEGIN:VCALENDAR/);

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
