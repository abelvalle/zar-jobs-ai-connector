import { createHash } from "node:crypto";

import JSZip from "jszip";

import { prepareApplicationKit } from "./application-tools.mjs";
import { renderResumeDocx } from "../resumes/resume-docx.mjs";
import { renderResumePdf } from "../resumes/resume-pdf.mjs";

const MAX_RESUME_CHARACTERS = 200_000;
const MAX_BUNDLE_BYTES = 5_000_000;
const ZIP_DATE = new Date("1980-01-01T00:00:00Z");
const TRACKING_PARAMETERS = new Set([
  "fbclid", "gclid", "mc_cid", "mc_eid", "msclkid", "ref", "trk",
]);
const NATIONAL_ID_KEYS = new Set([
  "dni", "nif", "nie", "nationalid", "nationalidentifier", "passportnumber", "ssn",
  "socialsecuritynumber", "taxid",
]);
const BIRTH_DATE_KEYS = new Set(["birthdate", "birthday", "dateofbirth", "dob"]);
const IMAGE_KEYS = new Set(["avatar", "image", "photo", "photograph", "picture"]);
const ADDRESS_KEYS = new Set(["address", "street", "streetaddress"]);
const POSTAL_KEYS = new Set(["postalcode", "postcode", "zipcode"]);

export function auditResumePrivacy(resume) {
  if (!isPlainObject(resume)) throw new TypeError("resume must be an object");
  const serializedLength = JSON.stringify(resume).length;
  if (serializedLength > MAX_RESUME_CHARACTERS) {
    throw new Error("Resume is too large for privacy review (200 KB maximum).");
  }

  const findings = [];
  walk(resume, "", (path, key, value) => {
    const normalizedKey = normalizeKey(key);
    if (NATIONAL_ID_KEYS.has(normalizedKey)) {
      addFinding(findings, path, "national-identifier", "critical",
        "Remove government or social-security identifiers from application CVs unless explicitly required by law.");
    }
    if (BIRTH_DATE_KEYS.has(normalizedKey)) {
      addFinding(findings, path, "date-of-birth", "high",
        "Remove date of birth unless it is explicitly required and appropriate for this application.");
    }
    if (IMAGE_KEYS.has(normalizedKey)) {
      addFinding(findings, path, "photo-or-image", "high",
        "Review whether a photo is necessary and appropriate for the target market.");
    }
    if (ADDRESS_KEYS.has(normalizedKey)) {
      addFinding(findings, path, "full-address", "high",
        "Prefer city and country over a street-level home address.");
    }
    if (POSTAL_KEYS.has(normalizedKey)) {
      addFinding(findings, path, "postal-code", "medium",
        "Review whether a postal code is needed for this application.");
    }
    if (typeof value === "string" && hasTrackingParameters(value)) {
      addFinding(findings, path, "tracking-parameters", "medium",
        "Remove tracking parameters from URLs before sharing the resume.");
    }
  });

  const contactFields = [
    ["basics.email", resume.basics?.email, "email"],
    ["basics.phone", resume.basics?.phone, "phone"],
    ["basics.url", resume.basics?.url, "website"],
    ["basics.location", resume.basics?.location, "location"],
    ["basics.profiles", resume.basics?.profiles, "profiles"],
  ].filter(([, value]) => hasValue(value)).map(([path, , type]) => ({ path, type }));
  const counts = findings.reduce((result, finding) => {
    result[finding.severity] += 1;
    return result;
  }, { critical: 0, high: 0, medium: 0, low: 0 });

  return {
    status: findings.length > 0 ? "review-required" : "no-selected-privacy-risks-detected",
    findings,
    counts,
    contactFields,
    valuesReturned: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "This path-based audit cannot identify every sensitive value or determine legal requirements for a target market.",
  };
}

export async function renderApplicationBundle({
  resume,
  jobDescription,
  target,
  coverLetter,
  screeningAnswers = [],
  template = "classic",
}) {
  assertSafeTarget(target);
  const privacy = auditResumePrivacy(resume);
  const kit = prepareApplicationKit({
    resume,
    jobDescription,
    target,
    coverLetter,
    screeningAnswers,
    template,
  });
  const [pdf, docx] = await Promise.all([
    renderResumePdf(resume, kit.suggestedFiles.resumePdf, template),
    renderResumeDocx(resume, kit.suggestedFiles.resumeDocx, template),
  ]);

  const payloads = [
    filePayload(pdf.fileName, pdf.mimeType, pdf.buffer),
    filePayload(docx.fileName, docx.mimeType, docx.buffer),
  ];
  if (typeof coverLetter === "string" && coverLetter.trim()) {
    payloads.push(filePayload(
      kit.suggestedFiles.coverLetter,
      "text/plain; charset=utf-8",
      Buffer.from(`${coverLetter.trim()}\n`, "utf8"),
    ));
  }
  if (screeningAnswers.length > 0) {
    payloads.push(filePayload(
      "screening-answers.json",
      "application/json",
      Buffer.from(`${JSON.stringify(screeningAnswers, null, 2)}\n`, "utf8"),
    ));
  }

  const status = kit.status === "review-required" || privacy.findings.length > 0
    ? "review-required"
    : "ready-for-human-review";
  const manifest = {
    schemaVersion: 1,
    createdBy: "Zar Jobs AI Connector",
    target: kit.target,
    template,
    status,
    files: payloads.map(({ buffer: _buffer, ...file }) => file),
    privacy,
    applicationReview: {
      status: kit.status,
      unsupportedResumeTopics: kit.resumePlan.unsupportedKeywords,
      coverLetterStatus: kit.coverLetterAudit?.status ?? "not-provided",
      screeningAnswerStatuses: kit.screeningAnswerAudits.map((item) => ({
        index: item.index,
        status: item.audit.status,
      })),
    },
    gates: [
      "Open and visually inspect the PDF and DOCX.",
      "Review every privacy finding and unsupported claim.",
      "Confirm the destination and application details manually.",
      "The user performs the final submission outside this plugin.",
    ],
    finalApprovalRequired: true,
    submissionPerformed: false,
    stored: false,
  };
  const archive = new JSZip();
  for (const file of payloads) {
    archive.file(file.name, file.buffer, { binary: true, date: ZIP_DATE, createFolders: false });
  }
  archive.file("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`, {
    date: ZIP_DATE,
    createFolders: false,
  });
  const buffer = await archive.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
  });
  if (buffer.length > MAX_BUNDLE_BYTES) {
    throw new Error("Application bundle exceeds the 5 MB limit.");
  }

  const stem = pdf.fileName.replace(/\.pdf$/i, "");
  return {
    status,
    format: "zip",
    mimeType: "application/zip",
    encoding: "base64",
    fileName: `${stem}-application.zip`,
    bytes: buffer.length,
    includedFiles: [...payloads.map((file) => file.name), "manifest.json"],
    manifest,
    finalApprovalRequired: true,
    submissionPerformed: false,
    stored: false,
    buffer,
  };
}

function filePayload(name, mimeType, buffer) {
  return {
    name,
    mimeType,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    buffer,
  };
}

function assertSafeTarget(target) {
  if (!isPlainObject(target)) throw new TypeError("target must be an object");
  for (const field of ["company", "role"]) {
    const value = target[field];
    if (typeof value !== "string" || value.trim().length < 1 || value.length > 200) {
      throw new TypeError(`target.${field} must contain between 1 and 200 characters`);
    }
    if (/[\\/\u0000-\u001f]/.test(value) || value.includes("..")) {
      throw new TypeError(`target.${field} contains unsupported characters`);
    }
  }
}

function walk(value, parentPath, visitor) {
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) walk(child, `${parentPath}[${index}]`, visitor);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    visitor(path, key, child);
    walk(child, path, visitor);
  }
}

function addFinding(findings, path, type, severity, recommendation) {
  if (!findings.some((finding) => finding.path === path && finding.type === type)) {
    findings.push({ path, type, severity, recommendation });
  }
}

function hasTrackingParameters(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  return [...parsed.searchParams.keys()].some((key) =>
    key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase()));
}

function normalizeKey(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/[^a-z0-9]/g, "");
}

function hasValue(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
