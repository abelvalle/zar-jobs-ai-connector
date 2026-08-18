import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import JSZip from "jszip";

import {
  importPortableWorkspace,
  renderPortableWorkspace,
  reviewPortableWorkspace,
} from "../src/workspace/portable-workspace.mjs";

const resume = {
  basics: {
    name: "Alex Example",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    location: { city: "Zaragoza", countryCode: "ES" },
    summary: "Backend engineer focused on reliable services.",
  },
  work: [{
    name: "Example Tech",
    position: "Backend Engineer",
    highlights: ["Reduced deployment time by 30%"],
  }],
};
const workspace = {
  schemaVersion: 1,
  profile: { name: "Alex Example", targetRoles: ["Backend Engineer"] },
  preferences: { remote: "hybrid" },
  baseResume: resume,
  resumeVariants: [{ id: "example-backend", resume }],
  jobs: [{ id: "job-1", title: "Backend Engineer", company: "Example Corp" }],
  applications: [{ id: "app-1", company: "Example Corp", notes: "Private recruiter note" }],
  answerBank: [{ id: "answer-1", answer: "A private confirmed answer" }],
};

test("reviews a redacted workspace without returning personal values", () => {
  const result = reviewPortableWorkspace(workspace);
  const serialized = JSON.stringify(result);

  assert.equal(result.privacyMode, "redacted");
  assert.equal(result.counts.resumeVariants, 1);
  assert.ok(result.redactions.some((item) => item.path === "baseResume.basics.email"));
  assert.ok(result.redactions.some((item) => item.path === "answerBank"));
  assert.doesNotMatch(serialized, /alex@example\.com|Private recruiter note|private confirmed answer/i);
  assert.equal(result.credentialsIncluded, false);
});

test("renders and imports a deterministic redacted workspace ZIP", async () => {
  const first = await renderPortableWorkspace({ workspace });
  const second = await renderPortableWorkspace({ workspace });

  assert.equal(first.fileName, "zar-jobs-workspace-redacted.zip");
  assert.deepEqual(first.buffer, second.buffer);
  const archive = await JSZip.loadAsync(first.buffer);
  assert.deepEqual(Object.keys(archive.files).sort(), ["manifest.json", "workspace.json"]);
  const manifest = JSON.parse(await archive.file("manifest.json").async("string"));
  const storedWorkspace = await archive.file("workspace.json").async("string");
  assert.equal(
    createHash("sha256").update(Buffer.from(storedWorkspace)).digest("hex"),
    manifest.files[0].sha256,
  );
  assert.doesNotMatch(storedWorkspace, /alex@example\.com|Private recruiter note/);

  const imported = await importPortableWorkspace(first.buffer.toString("base64"));
  assert.equal(imported.checksumVerified, true);
  assert.equal(imported.workspace.baseResume.basics.name, "Candidate");
  assert.equal(imported.workspace.baseResume.basics.email, undefined);
  assert.equal(imported.workspace.answerBank.length, 0);
  assert.equal(imported.stored, false);
});

test("requires explicit consent for full export and import", async () => {
  assert.throws(
    () => reviewPortableWorkspace(workspace, "full"),
    /includePersonalData: true/,
  );
  const result = await renderPortableWorkspace({
    workspace,
    privacyMode: "full",
    includePersonalData: true,
  });
  await assert.rejects(
    () => importPortableWorkspace(result.buffer.toString("base64")),
    /acceptPersonalData: true/,
  );
  const imported = await importPortableWorkspace(result.buffer.toString("base64"), true);
  assert.equal(imported.workspace.baseResume.basics.email, "alex@example.com");
});

test("rejects credentials, unsupported fields, and tampered checksums", async () => {
  const withSecret = structuredClone(workspace);
  withSecret.profile.apiToken = "do-not-store-this";
  assert.throws(() => reviewPortableWorkspace(withSecret), /Credentials and secrets are not allowed/);
  assert.throws(
    () => reviewPortableWorkspace({ ...workspace, unexpected: true }),
    /Unsupported workspace field/,
  );

  const rendered = await renderPortableWorkspace({ workspace });
  const archive = await JSZip.loadAsync(rendered.buffer);
  const manifest = JSON.parse(await archive.file("manifest.json").async("string"));
  manifest.files[0].sha256 = "0".repeat(64);
  archive.file("manifest.json", JSON.stringify(manifest));
  const tampered = await archive.generateAsync({ type: "nodebuffer" });
  await assert.rejects(
    () => importPortableWorkspace(tampered.toString("base64")),
    /checksum verification failed/,
  );
});
