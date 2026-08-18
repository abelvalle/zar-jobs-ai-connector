import { createHash } from "node:crypto";

import JSZip from "jszip";

import { renderResumeDocx } from "./resume-docx.mjs";
import { renderResumePdf } from "./resume-pdf.mjs";
import { RESUME_TEMPLATES, validateResume } from "./resume-tools.mjs";

export const ANONYMIZATION_MODES = Object.freeze(["contact-safe", "blind-review"]);
export const ANONYMOUS_EMAIL = "candidate@example.invalid";

const MAX_BUNDLE_BYTES = 5_000_000;
const ZIP_DATE = new Date("1980-01-01T00:00:00Z");
const SENSITIVE_KEYS = new Set([
  "address", "avatar", "birthdate", "birthday", "dateofbirth", "dni", "dob", "image",
  "nationalid", "nationalidentifier", "nif", "nie", "passportnumber", "photo", "photograph",
  "picture", "postalcode", "postcode", "references", "socialsecuritynumber", "ssn",
  "street", "streetaddress", "taxid", "zipcode",
]);

export function planResumeAnonymization(resume, mode = "contact-safe") {
  assertResume(resume);
  assertMode(mode);
  const operations = directOperations(resume);
  if (mode === "blind-review") operations.push(...blindOperations(resume));
  const residualIdentifierReferences = findResidualIdentifierReferences(resume);

  return {
    mode,
    operations,
    residualIdentifierReferences,
    replacements: mode === "blind-review"
      ? { employers: "Employer N", institutions: "Institution N", projects: "Project N" }
      : {},
    sourceValuesReturned: false,
    baseResumeModified: false,
    anonymityGuaranteed: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "Field removal cannot guarantee anonymity. Free text, dates, rare achievements, employers, and project details may still identify a person.",
  };
}

export function createAnonymousResume(resume, mode = "contact-safe") {
  const plan = planResumeAnonymization(resume, mode);
  const anonymousResume = structuredClone(resume);
  const basics = anonymousResume.basics;
  basics.name = "Candidate";
  basics.email = ANONYMOUS_EMAIL;
  for (const key of ["phone", "url", "image", "location", "profiles"]) delete basics[key];
  deleteSensitiveKeys(anonymousResume);
  if (mode === "blind-review") applyBlindReplacements(anonymousResume);
  anonymousResume.meta = {
    ...(anonymousResume.meta ?? {}),
    anonymous: true,
    anonymizationMode: mode,
  };
  assertResume(anonymousResume);

  return {
    mode,
    anonymousResume,
    operations: plan.operations,
    residualIdentifierReferences: plan.residualIdentifierReferences,
    status: plan.residualIdentifierReferences.length > 0 ? "review-required" : "ready-for-human-review",
    placeholderEmail: {
      path: "basics.email",
      valueReturned: false,
      purpose: "Schema-only reserved .invalid address; document renderers omit it.",
    },
    baseResumeModified: false,
    factsAdded: false,
    anonymityGuaranteed: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer: plan.disclaimer,
  };
}

export async function renderAnonymousResumeBundle({
  resume,
  mode = "contact-safe",
  template = "classic",
}) {
  if (!RESUME_TEMPLATES.includes(template)) throw new Error(`Unknown resume template: ${template}`);
  const result = createAnonymousResume(resume, mode);
  if (result.residualIdentifierReferences.length > 0) {
    throw new Error("Anonymous bundle blocked: direct identifiers remain in free-text fields.");
  }
  const stem = mode === "blind-review" ? "candidate-blind-resume" : "candidate-contact-safe-resume";
  const [pdf, docx] = await Promise.all([
    renderResumePdf(result.anonymousResume, `${stem}.pdf`, template),
    renderResumeDocx(result.anonymousResume, `${stem}.docx`, template),
  ]);
  const jsonBuffer = Buffer.from(`${stableJson(result.anonymousResume)}\n`, "utf8");
  const files = [
    fileRecord(`${stem}.json`, "application/json", jsonBuffer),
    fileRecord(pdf.fileName, pdf.mimeType, pdf.buffer),
    fileRecord(docx.fileName, docx.mimeType, docx.buffer),
  ];
  const manifest = {
    format: "zar-jobs-anonymous-resume-bundle",
    schemaVersion: 1,
    createdBy: "Zar Jobs AI Connector",
    mode,
    template,
    files: files.map(({ buffer: _buffer, ...file }) => file),
    operations: result.operations,
    directIdentifiersRemoved: true,
    placeholderEmailRendered: false,
    sourceResumeIncluded: false,
    anonymityGuaranteed: false,
    humanReviewRequired: true,
    writePerformed: false,
    stored: false,
    gates: [
      "Open and visually inspect the PDF and DOCX.",
      "Search every file for names, contact details, unique identifiers, and revealing free text.",
      "Share only after the user accepts the residual re-identification risk.",
    ],
  };
  const archive = new JSZip();
  for (const file of files) {
    archive.file(file.name, file.buffer, { binary: true, date: ZIP_DATE, createFolders: false });
  }
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
  if (buffer.length > MAX_BUNDLE_BYTES) throw new Error("Anonymous resume bundle exceeds 5 MB.");

  return {
    format: manifest.format,
    schemaVersion: manifest.schemaVersion,
    mode,
    template,
    fileName: `${stem}-bundle.zip`,
    mimeType: "application/zip",
    encoding: "base64",
    bytes: buffer.length,
    includedFiles: [...files.map((file) => file.name), "manifest.json"],
    manifest,
    sourceResumeIncluded: false,
    anonymityGuaranteed: false,
    humanReviewRequired: true,
    writePerformed: false,
    stored: false,
    buffer,
  };
}

function directOperations(resume) {
  const operations = [
    operation("basics.name", "replace", "direct-identifier", "Candidate"),
    operation("basics.email", "replace", "direct-identifier", "reserved-invalid-placeholder"),
  ];
  for (const key of ["phone", "url", "image", "location", "profiles"]) {
    if (Object.hasOwn(resume.basics, key)) {
      operations.push(operation(`basics.${key}`, "remove", "contact-or-location"));
    }
  }
  walk(resume, "", (path, key) => {
    if (SENSITIVE_KEYS.has(normalizeKey(key)) && !operations.some((item) => item.path === path)) {
      operations.push(operation(path, "remove", "selected-sensitive-field"));
    }
    if (normalizeKey(key) === "url" && path !== "basics.url") {
      operations.push(operation(path, "remove", "re-identification-link"));
    }
  });
  return uniqueOperations(operations);
}

function blindOperations(resume) {
  const operations = [];
  addIndexedOperations(operations, resume.work, "work", "name", "Employer");
  addIndexedOperations(operations, resume.volunteer, "volunteer", "organization", "Organization");
  addIndexedOperations(operations, resume.education, "education", "institution", "Institution");
  addIndexedOperations(operations, resume.projects, "projects", "name", "Project");
  addIndexedOperations(operations, resume.certificates, "certificates", "issuer", "Issuer");
  addIndexedOperations(operations, resume.publications, "publications", "publisher", "Publisher");
  return operations;
}

function applyBlindReplacements(resume) {
  replaceIndexed(resume.work, "name", "Employer");
  replaceIndexed(resume.volunteer, "organization", "Organization");
  replaceIndexed(resume.education, "institution", "Institution");
  replaceIndexed(resume.projects, "name", "Project");
  replaceIndexed(resume.certificates, "issuer", "Issuer");
  replaceIndexed(resume.publications, "publisher", "Publisher");
}

function findResidualIdentifierReferences(resume) {
  const identifiers = [resume.basics?.name, resume.basics?.email, resume.basics?.phone]
    .filter((value) => typeof value === "string" && value.trim().length >= 4)
    .map((value) => normalizeText(value));
  if (identifiers.length === 0) return [];
  const ignored = new Set(["basics.name", "basics.email", "basics.phone"]);
  const findings = [];
  walk(resume, "", (path, _key, value) => {
    if (ignored.has(path) || typeof value !== "string") return;
    const normalized = normalizeText(value);
    if (identifiers.some((identifier) => normalized.includes(identifier))) {
      findings.push({
        path,
        category: "direct-identifier-in-free-text",
        recommendation: "Rewrite or remove this field before rendering an anonymous bundle.",
      });
    }
  });
  return findings;
}

function deleteSensitiveKeys(value) {
  if (Array.isArray(value)) {
    value.forEach(deleteSensitiveKeys);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value)) {
    const normalized = normalizeKey(key);
    if (SENSITIVE_KEYS.has(normalized) || normalized === "url") {
      delete value[key];
    } else {
      deleteSensitiveKeys(value[key]);
    }
  }
}

function addIndexedOperations(operations, items, root, key, label) {
  for (const [index, item] of (items ?? []).entries()) {
    if (typeof item?.[key] === "string" && item[key].trim()) {
      operations.push(operation(`${root}[${index}].${key}`, "replace", "blind-review", `${label} ${index + 1}`));
    }
  }
}

function replaceIndexed(items, key, label) {
  for (const [index, item] of (items ?? []).entries()) {
    if (typeof item?.[key] === "string" && item[key].trim()) item[key] = `${label} ${index + 1}`;
  }
}

function operation(path, action, category, replacement = undefined) {
  return replacement === undefined
    ? { path, action, category }
    : { path, action, category, replacement };
}

function uniqueOperations(operations) {
  const seen = new Set();
  return operations.filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
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

function walk(value, parentPath, visitor) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${parentPath}[${index}]`, visitor));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    visitor(path, key, child);
    walk(child, path, visitor);
  }
}

function assertResume(resume) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
}

function assertMode(mode) {
  if (!ANONYMIZATION_MODES.includes(mode)) {
    throw new TypeError(`mode must use one of: ${ANONYMIZATION_MODES.join(", ")}`);
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

function normalizeText(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
