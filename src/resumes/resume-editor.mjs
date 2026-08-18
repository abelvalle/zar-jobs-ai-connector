import { createHash } from "node:crypto";

import { auditResumeVariant, validateResume } from "./resume-tools.mjs";

const MAX_CHANGES = 50;
const MAX_PATH_LENGTH = 200;
const MAX_VALUE_CHARACTERS = 20_000;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SOURCES = new Set(["base-resume", "user-confirmed"]);

export function applyResumeChanges(baseResume, changes) {
  assertValidResume(baseResume, "base resume");
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > MAX_CHANGES) {
    throw new TypeError(`changes must contain between 1 and ${MAX_CHANGES} items`);
  }

  const variantResume = structuredClone(baseResume);
  const lineage = changes.map((change, index) => applyChange(
    variantResume,
    baseResume,
    change,
    index,
  ));
  const validation = validateResume(variantResume);
  const audit = auditResumeVariant(baseResume, variantResume);

  return {
    status: validation.valid ? "review-required" : "invalid-variant",
    baseHash: resumeHash(baseResume),
    variantHash: resumeHash(variantResume),
    variantResume,
    lineage,
    validation,
    audit,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "Source labels record declared provenance; they do not prove a claim. Review every change before using the variant.",
  };
}

export function compareResumeVersions(baseResume, variantResume) {
  assertValidResume(baseResume, "base resume");
  if (!isContainer(variantResume)) throw new TypeError("variant resume must be an object");

  const differences = [];
  collectDifferences(baseResume, variantResume, "", differences);
  const validation = validateResume(variantResume);
  const audit = auditResumeVariant(baseResume, variantResume);

  return {
    identical: differences.length === 0,
    baseHash: resumeHash(baseResume),
    variantHash: resumeHash(variantResume),
    differences,
    truncated: differences.length >= 200,
    validation,
    audit,
    humanReviewRequired: true,
    stored: false,
  };
}

function applyChange(target, baseResume, change, index) {
  if (!isContainer(change)) throw new TypeError(`changes[${index}] must be an object`);
  if (!new Set(["add", "replace", "remove"]).has(change.operation)) {
    throw new TypeError(`changes[${index}].operation is invalid`);
  }
  if (!SOURCES.has(change.source)) {
    throw new TypeError(`changes[${index}].source is invalid`);
  }

  const segments = parsePath(change.path, `changes[${index}].path`);
  const { parent, key } = resolveParent(target, segments);
  const exists = hasOwn(parent, key);
  const before = exists ? structuredClone(parent[key]) : undefined;

  if (change.operation === "add" && exists) {
    throw new Error(`Cannot add existing path: ${change.path}`);
  }
  if ((change.operation === "replace" || change.operation === "remove") && !exists) {
    throw new Error(`Cannot ${change.operation} missing path: ${change.path}`);
  }
  if (change.operation !== "remove") {
    assertJsonValue(change.value, `changes[${index}].value`);
    assertSourceEvidence(baseResume, change, index);
  }

  if (change.operation === "remove") {
    if (Array.isArray(parent)) parent.splice(key, 1);
    else delete parent[key];
  } else if (Array.isArray(parent) && change.operation === "add") {
    if (key !== parent.length) throw new Error(`Array additions must use the next index: ${change.path}`);
    parent.push(structuredClone(change.value));
  } else {
    parent[key] = structuredClone(change.value);
  }

  return {
    changeId: `change-${String(index + 1).padStart(3, "0")}`,
    operation: change.operation,
    path: change.path,
    before,
    after: change.operation === "remove" ? undefined : structuredClone(change.value),
    source: change.source,
    sourcePath: change.sourcePath ?? null,
    note: typeof change.note === "string" ? change.note.trim() : "",
  };
}

function assertSourceEvidence(baseResume, change, index) {
  if (change.source !== "base-resume") return;
  if (typeof change.sourcePath !== "string") {
    throw new TypeError(`changes[${index}].sourcePath is required for base-resume values`);
  }
  const sourceValue = readPath(baseResume, parsePath(
    change.sourcePath,
    `changes[${index}].sourcePath`,
  ));
  if (!deepEqual(sourceValue, change.value)) {
    throw new Error(`Base-resume value does not match sourcePath: ${change.sourcePath}`);
  }
}

function parsePath(path, label) {
  if (typeof path !== "string" || path.length === 0 || path.length > MAX_PATH_LENGTH) {
    throw new TypeError(`${label} must be a non-empty resume path`);
  }
  const normalized = path.replace(/\[(\d+)\]/g, ".$1");
  if (!/^[A-Za-z0-9_.]+$/.test(normalized) || normalized.startsWith(".") || normalized.endsWith(".")) {
    throw new TypeError(`${label} is invalid`);
  }
  const segments = normalized.split(".").map((segment) => /^\d+$/.test(segment)
    ? Number(segment)
    : segment);
  if (segments.some((segment) => FORBIDDEN_KEYS.has(String(segment)))) {
    throw new TypeError(`${label} contains a forbidden key`);
  }
  return segments;
}

function resolveParent(value, segments) {
  let current = value;
  for (const segment of segments.slice(0, -1)) {
    if (!isContainer(current) || !hasOwn(current, segment)) {
      throw new Error(`Resume path does not exist: ${formatPath(segments)}`);
    }
    current = current[segment];
  }
  if (!isContainer(current)) throw new Error(`Resume path is not editable: ${formatPath(segments)}`);
  const key = segments.at(-1);
  if (Array.isArray(current) && (!Number.isInteger(key) || key < 0 || key > current.length)) {
    throw new TypeError(`Array path index is invalid: ${formatPath(segments)}`);
  }
  return { parent: current, key };
}

function readPath(value, segments) {
  let current = value;
  for (const segment of segments) {
    if (!isContainer(current) || !hasOwn(current, segment)) {
      throw new Error(`Source path does not exist: ${formatPath(segments)}`);
    }
    current = current[segment];
  }
  return current;
}

function collectDifferences(before, after, path, output) {
  if (output.length >= 200 || deepEqual(before, after)) return;
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length && output.length < 200; index += 1) {
      collectDifferences(before[index], after[index], `${path}[${index}]`, output);
    }
    return;
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      collectDifferences(before[key], after[key], path ? `${path}.${key}` : key, output);
    }
    return;
  }
  output.push({
    path,
    type: before === undefined ? "added" : after === undefined ? "removed" : "changed",
    before,
    after,
  });
}

function assertValidResume(resume, label) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid ${label}: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
}

function assertJsonValue(value, label) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    throw new TypeError(`${label} must be a JSON value`);
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined || serialized.length > MAX_VALUE_CHARACTERS) {
    throw new TypeError(`${label} exceeds the 20 KB limit`);
  }
}

function resumeHash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function deepEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isContainer(value) {
  return Array.isArray(value) || isPlainObject(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function formatPath(segments) {
  return segments.map((segment, index) => typeof segment === "number"
    ? `[${segment}]`
    : `${index === 0 ? "" : "."}${segment}`).join("");
}
