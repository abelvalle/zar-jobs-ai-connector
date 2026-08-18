import { createHash } from "node:crypto";

import JSZip from "jszip";

import { validateResume } from "../resumes/resume-tools.mjs";

export const WORKSPACE_PRIVACY_MODES = Object.freeze(["redacted", "full"]);

const MAX_WORKSPACE_BYTES = 5_000_000;
const MAX_ARCHIVE_BYTES = 6_000_000;
const ZIP_DATE = new Date("1980-01-01T00:00:00Z");
const ALLOWED_KEYS = new Set([
  "schemaVersion", "id", "createdAt", "updatedAt", "profile", "preferences",
  "baseResume", "resumeVariants", "jobs", "snapshots", "applications", "answerBank",
]);
const SECRET_KEYS = new Set([
  "password", "passwd", "secret", "clientsecret", "apikey", "token", "accesstoken",
  "refreshtoken", "cookie", "sessioncookie", "authorization", "privatekey",
]);
const PROFILE_CONTACT_KEYS = new Set([
  "name", "fullname", "email", "phone", "address", "location", "url", "website",
  "linkedin", "github", "profiles",
]);

export function reviewPortableWorkspace(
  workspace,
  privacyMode = "redacted",
  includePersonalData = false,
) {
  const validated = validateWorkspace(workspace);
  assertPrivacyMode(privacyMode, includePersonalData);
  const { workspace: prepared, redactions } = privacyMode === "redacted"
    ? redactWorkspace(validated)
    : { workspace: structuredClone(validated), redactions: [] };
  const privacy = workspacePrivacySummary(validated, privacyMode, redactions);

  return {
    schemaVersion: 1,
    privacyMode,
    counts: workspaceCounts(prepared),
    bytes: Buffer.byteLength(stableJson(prepared)),
    redactions,
    privacy,
    credentialsIncluded: false,
    writePerformed: false,
    stored: false,
    humanReviewRequired: true,
  };
}

export async function renderPortableWorkspace({
  workspace,
  privacyMode = "redacted",
  includePersonalData = false,
}) {
  const validated = validateWorkspace(workspace);
  assertPrivacyMode(privacyMode, includePersonalData);
  const { workspace: prepared, redactions } = privacyMode === "redacted"
    ? redactWorkspace(validated)
    : { workspace: structuredClone(validated), redactions: [] };
  const workspaceBytes = Buffer.from(`${stableJson(prepared)}\n`, "utf8");
  if (workspaceBytes.length > MAX_WORKSPACE_BYTES) {
    throw new Error("Prepared workspace exceeds the 5 MB limit.");
  }
  const workspaceFile = fileRecord("workspace.json", "application/json", workspaceBytes);
  const manifest = {
    format: "zar-jobs-portable-workspace",
    schemaVersion: 1,
    createdBy: "Zar Jobs AI Connector",
    privacyMode,
    counts: workspaceCounts(prepared),
    privacy: workspacePrivacySummary(validated, privacyMode, redactions),
    files: [{ ...workspaceFile, buffer: undefined }],
    credentialsIncluded: false,
    redactions,
    importRequiresPersonalDataConsent: privacyMode === "full",
    humanReviewRequired: true,
    writePerformed: false,
    stored: false,
  };
  delete manifest.files[0].buffer;

  const archive = new JSZip();
  archive.file(workspaceFile.name, workspaceBytes, {
    binary: true,
    date: ZIP_DATE,
    createFolders: false,
  });
  archive.file("manifest.json", `${stableJson(manifest)}\n`, {
    date: ZIP_DATE,
    createFolders: false,
  });
  const buffer = await archive.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
  });
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    throw new Error("Portable workspace archive exceeds the 6 MB limit.");
  }

  return {
    format: manifest.format,
    schemaVersion: manifest.schemaVersion,
    privacyMode,
    fileName: `zar-jobs-workspace-${privacyMode}.zip`,
    mimeType: "application/zip",
    encoding: "base64",
    bytes: buffer.length,
    includedFiles: ["workspace.json", "manifest.json"],
    manifest,
    credentialsIncluded: false,
    humanReviewRequired: true,
    writePerformed: false,
    stored: false,
    buffer,
  };
}

export async function importPortableWorkspace(archiveBase64, acceptPersonalData = false) {
  if (typeof archiveBase64 !== "string" || archiveBase64.length < 4) {
    throw new TypeError("archiveBase64 must be a non-empty base64 string");
  }
  if (archiveBase64.length > Math.ceil(MAX_ARCHIVE_BYTES * 4 / 3) + 16) {
    throw new Error("Portable workspace archive exceeds the 6 MB limit.");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(archiveBase64)) {
    throw new TypeError("archiveBase64 must contain valid base64 data");
  }
  const buffer = Buffer.from(archiveBase64, "base64");
  if (buffer.length > MAX_ARCHIVE_BYTES || buffer.subarray(0, 2).toString("ascii") !== "PK") {
    throw new Error("Portable workspace must be a ZIP archive within the 6 MB limit.");
  }
  const archive = await JSZip.loadAsync(buffer, { checkCRC32: true });
  const names = Object.keys(archive.files).sort();
  if (names.some((name) => archive.files[name].dir || name.includes("/") || name.includes("\\"))) {
    throw new Error("Portable workspace contains unsupported paths or directories.");
  }
  if (names.length !== 2 || names[0] !== "manifest.json" || names[1] !== "workspace.json") {
    throw new Error("Portable workspace must contain only manifest.json and workspace.json.");
  }
  const [manifestText, workspaceText] = await Promise.all([
    archive.file("manifest.json").async("string"),
    archive.file("workspace.json").async("string"),
  ]);
  if (Buffer.byteLength(workspaceText) > MAX_WORKSPACE_BYTES) {
    throw new Error("Imported workspace exceeds the 5 MB limit.");
  }
  const manifest = parseJson(manifestText, "manifest.json");
  const workspace = parseJson(workspaceText, "workspace.json");
  validateManifest(manifest, workspaceText);
  if (manifest.privacyMode === "full" && acceptPersonalData !== true) {
    throw new Error("Importing a full workspace requires acceptPersonalData: true.");
  }
  const validated = validateWorkspace(workspace, manifest.privacyMode === "redacted");

  return {
    format: manifest.format,
    schemaVersion: manifest.schemaVersion,
    privacyMode: manifest.privacyMode,
    counts: workspaceCounts(validated),
    workspace: validated,
    checksumVerified: true,
    credentialsIncluded: false,
    humanReviewRequired: true,
    writePerformed: false,
    stored: false,
  };
}

function validateWorkspace(workspace, allowRedactedResume = false) {
  if (!isPlainObject(workspace)) throw new TypeError("workspace must be an object");
  const copy = structuredClone(workspace);
  if (copy.schemaVersion !== 1) throw new Error("workspace.schemaVersion must be 1");
  const unknown = Object.keys(copy).filter((key) => !ALLOWED_KEYS.has(key));
  if (unknown.length > 0) throw new Error(`Unsupported workspace field: ${unknown[0]}`);
  assertNoSecrets(copy);
  assertOptionalObject(copy.profile, "workspace.profile");
  assertOptionalObject(copy.preferences, "workspace.preferences");
  assertArray(copy.resumeVariants, "workspace.resumeVariants", 100);
  assertArray(copy.jobs, "workspace.jobs", 500);
  assertArray(copy.snapshots, "workspace.snapshots", 50);
  assertArray(copy.applications, "workspace.applications", 500);
  assertArray(copy.answerBank, "workspace.answerBank", 200);
  if (copy.baseResume !== undefined) {
    assertResume(copy.baseResume, "workspace.baseResume", allowRedactedResume);
  }
  for (const [index, variant] of (copy.resumeVariants ?? []).entries()) {
    if (!isPlainObject(variant) || typeof variant.id !== "string" || !variant.id.trim()) {
      throw new Error(`workspace.resumeVariants[${index}] requires a non-empty id`);
    }
    assertResume(variant.resume, `workspace.resumeVariants[${index}].resume`, allowRedactedResume);
  }
  const contentKeys = [
    "profile", "preferences", "baseResume", "resumeVariants", "jobs", "snapshots",
    "applications", "answerBank",
  ];
  if (!contentKeys.some((key) => hasContent(copy[key]))) {
    throw new Error("workspace must contain at least one supported data section");
  }
  if (Buffer.byteLength(stableJson(copy)) > MAX_WORKSPACE_BYTES) {
    throw new Error("Workspace exceeds the 5 MB limit.");
  }
  return copy;
}

function redactWorkspace(workspace) {
  const copy = structuredClone(workspace);
  const redactions = [];
  if (copy.profile) redactProfile(copy.profile, "profile", redactions);
  if (copy.baseResume) redactResume(copy.baseResume, "baseResume", redactions);
  for (const [index, variant] of (copy.resumeVariants ?? []).entries()) {
    redactResume(variant.resume, `resumeVariants[${index}].resume`, redactions);
  }
  for (const [index, application] of (copy.applications ?? []).entries()) {
    removeField(application, "notes", `applications[${index}].notes`, redactions, "free-text");
  }
  if ((copy.answerBank ?? []).length > 0) {
    redactions.push({ path: "answerBank", action: "removed", category: "free-text" });
    copy.answerBank = [];
  }
  return { workspace: copy, redactions };
}

function redactProfile(profile, path, redactions) {
  for (const key of Object.keys(profile)) {
    if (PROFILE_CONTACT_KEYS.has(normalizeKey(key))) {
      removeField(profile, key, `${path}.${key}`, redactions, "direct-identifier");
    }
  }
}

function redactResume(resume, path, redactions) {
  if (!isPlainObject(resume.basics)) return;
  if (typeof resume.basics.name === "string" && resume.basics.name !== "Candidate") {
    resume.basics.name = "Candidate";
    redactions.push({ path: `${path}.basics.name`, action: "replaced", category: "direct-identifier" });
  }
  for (const key of ["email", "phone", "url", "image", "location", "profiles"]) {
    removeField(resume.basics, key, `${path}.basics.${key}`, redactions, "contact-or-location");
  }
}

function workspacePrivacySummary(workspace, privacyMode, redactions) {
  let resumeContactSections = 0;
  const resumes = [workspace.baseResume, ...(workspace.resumeVariants ?? []).map((item) => item.resume)]
    .filter(Boolean);
  for (const resume of resumes) {
    const basics = resume.basics ?? {};
    if ([basics.name, basics.email, basics.phone, basics.url, basics.image, basics.location, basics.profiles]
      .some(hasContent)) resumeContactSections += 1;
  }
  return {
    status: privacyMode === "full" && resumeContactSections > 0
      ? "personal-data-review-required"
      : "redacted-review-required",
    resumeContactSections,
    freeTextApplicationNotes: (workspace.applications ?? []).filter((item) => hasContent(item?.notes)).length,
    answerBankEntries: (workspace.answerBank ?? []).length,
    redactionCount: redactions.length,
    valuesReturned: false,
    disclaimer:
      "Redaction targets selected fields and cannot guarantee anonymity; employers, projects, dates, and achievements may still identify a person.",
  };
}

function workspaceCounts(workspace) {
  return {
    resumeVariants: workspace.resumeVariants?.length ?? 0,
    jobs: workspace.jobs?.length ?? 0,
    snapshots: workspace.snapshots?.length ?? 0,
    applications: workspace.applications?.length ?? 0,
    answerBank: workspace.answerBank?.length ?? 0,
    hasBaseResume: Boolean(workspace.baseResume),
    hasPreferences: Boolean(workspace.preferences),
  };
}

function validateManifest(manifest, workspaceText) {
  if (!isPlainObject(manifest)
    || manifest.format !== "zar-jobs-portable-workspace"
    || manifest.schemaVersion !== 1
    || !WORKSPACE_PRIVACY_MODES.includes(manifest.privacyMode)
    || manifest.credentialsIncluded !== false
    || !Array.isArray(manifest.files)
    || manifest.files.length !== 1
    || manifest.files[0]?.name !== "workspace.json") {
    throw new Error("Portable workspace manifest is invalid or unsupported.");
  }
  const bytes = Buffer.from(workspaceText, "utf8");
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (manifest.files[0].bytes !== bytes.length || manifest.files[0].sha256 !== checksum) {
    throw new Error("Portable workspace checksum verification failed.");
  }
}

function assertNoSecrets(value, path = "workspace") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);
    if (SECRET_KEYS.has(normalizedKey)
      || normalizedKey.endsWith("token")
      || normalizedKey.endsWith("secret")
      || normalizedKey.endsWith("password")
      || normalizedKey.endsWith("cookie")
      || normalizedKey.endsWith("privatekey")) {
      throw new Error(`Credentials and secrets are not allowed in portable workspaces (${path}.${key}).`);
    }
    assertNoSecrets(child, `${path}.${key}`);
  }
}

function assertPrivacyMode(privacyMode, includePersonalData) {
  if (!WORKSPACE_PRIVACY_MODES.includes(privacyMode)) {
    throw new TypeError(`privacyMode must use one of: ${WORKSPACE_PRIVACY_MODES.join(", ")}`);
  }
  if (privacyMode === "full" && includePersonalData !== true) {
    throw new Error("A full workspace requires includePersonalData: true.");
  }
}

function assertResume(resume, path, allowRedactedResume = false) {
  const validation = validateResume(resume);
  const errors = allowRedactedResume
    ? validation.errors.filter((error) => error.path !== "instance.basics.email")
    : validation.errors;
  if (errors.length > 0) throw new Error(`${path} is invalid: ${errors[0].message}`);
}

function assertOptionalObject(value, path) {
  if (value !== undefined && !isPlainObject(value)) throw new TypeError(`${path} must be an object`);
}

function assertArray(value, path, maximum) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > maximum) {
    throw new TypeError(`${path} must be an array with at most ${maximum} items`);
  }
  if (value.some((item) => !isPlainObject(item))) {
    throw new TypeError(`${path} items must be objects`);
  }
}

function removeField(object, key, path, redactions, category) {
  if (Object.hasOwn(object, key)) {
    delete object[key];
    redactions.push({ path, action: "removed", category });
  }
}

function fileRecord(name, mimeType, buffer) {
  return {
    name,
    mimeType,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    buffer,
  };
}

function parseJson(text, name) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} contains invalid JSON.`);
  }
}

function stableJson(value) {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}

function normalizeKey(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/[^a-z0-9]/g, "");
}

function hasContent(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
