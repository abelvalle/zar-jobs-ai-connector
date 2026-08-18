import { createHash } from "node:crypto";

import { XMLParser } from "fast-xml-parser";

import { fingerprintJobs } from "./job-import.mjs";
import { normalizeJobUrl } from "../portals/url-normalizer.mjs";

export const JOB_ALERT_FORMATS = Object.freeze(["rss", "atom", "json", "csv", "text"]);

const MAX_CONTENT_BYTES = 2_000_000;
const MAX_ITEMS = 200;
const FIELD_ALIASES = Object.freeze({
  externalId: ["externalid", "external_id", "id", "guid", "jobid", "job_id"],
  title: ["title", "jobtitle", "job_title", "position", "role", "puesto"],
  company: ["company", "companyname", "company_name", "employer", "author", "empresa"],
  location: ["location", "city", "ubicacion", "ubicación"],
  url: ["url", "link", "joburl", "job_url"],
  publishedAt: ["publishedat", "published_at", "published", "pubdate", "date", "updated"],
  workplaceType: ["workplacetype", "workplace_type", "remote", "modality", "modalidad"],
  employmentType: ["employmenttype", "employment_type", "contract", "contracttype"],
  salary: ["salary", "compensation", "salario"],
  description: ["description", "summary", "content", "jobdescription", "job_description"],
  source: ["source", "portal", "origin"],
});

const SNAPSHOT_FIELDS = [
  "title", "company", "location", "workplaceType", "employmentType", "salary",
  "description", "publishedAt", "url",
];

export function importJobAlert(content, { format, sourceLabel, limit = 100 } = {}) {
  if (typeof content !== "string" || !content.trim()) {
    throw new TypeError("content is required");
  }
  if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
    throw new Error("Job alert content exceeded the 2 MB safety limit.");
  }
  if (!JOB_ALERT_FORMATS.includes(format)) {
    throw new TypeError(`format must be one of: ${JOB_ALERT_FORMATS.join(", ")}`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ITEMS) {
    throw new TypeError(`limit must be an integer between 1 and ${MAX_ITEMS}`);
  }
  const safeSourceLabel = sourceLabel === undefined
    ? null
    : boundedText(sourceLabel, "sourceLabel", 100);

  const parsed = parseAlert(content, format);
  const jobs = [];
  let skippedItems = 0;
  for (const item of parsed.items) {
    const job = normalizeAlertItem(item, format, safeSourceLabel);
    if (job === null) {
      skippedItems += 1;
      continue;
    }
    jobs.push(job);
    if (jobs.length === limit) break;
  }

  return {
    format,
    sourceLabel: safeSourceLabel,
    feedTitle: parsed.title,
    jobs,
    diagnostics: {
      receivedItems: parsed.items.length,
      returnedItems: jobs.length,
      skippedItems,
      truncated: jobs.length === limit && parsed.items.length - skippedItems > limit,
    },
    evidence: "user-provided-alert",
    verificationStatus: "unverified",
    networkAccess: false,
    stored: false,
    safeNextAction: "Review every normalized field against the original alert before using the job.",
  };
}

export function compareJobSnapshots(previousJobs, currentJobs) {
  const previous = snapshotIndex(previousJobs, "previousJobs");
  const current = snapshotIndex(currentJobs, "currentJobs");
  const added = [];
  const removed = [];
  const changed = [];
  let unchanged = 0;

  for (const [fingerprint, currentItem] of current.byFingerprint) {
    const previousItem = previous.byFingerprint.get(fingerprint);
    if (!previousItem) {
      added.push(snapshotSummary(currentItem, fingerprint));
      continue;
    }
    const changedFields = SNAPSHOT_FIELDS.filter((field) =>
      normalizedSnapshotValue(previousItem.job, field) !== normalizedSnapshotValue(currentItem.job, field));
    if (changedFields.length === 0) {
      unchanged += 1;
    } else {
      changed.push({
        fingerprint,
        previousId: textOrNull(previousItem.job.id),
        currentId: textOrNull(currentItem.job.id),
        title: textOrNull(currentItem.job.title),
        company: textOrNull(currentItem.job.company),
        changedFields,
        previousContentHash: contentHash(previousItem.job),
        currentContentHash: contentHash(currentItem.job),
      });
    }
  }
  for (const [fingerprint, previousItem] of previous.byFingerprint) {
    if (!current.byFingerprint.has(fingerprint)) {
      removed.push(snapshotSummary(previousItem, fingerprint));
    }
  }

  added.sort(compareSnapshotSummaries);
  removed.sort(compareSnapshotSummaries);
  changed.sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));
  const reposts = exactReposts(removed, added);

  return {
    previousUniqueJobs: previous.byFingerprint.size,
    currentUniqueJobs: current.byFingerprint.size,
    added,
    removed,
    changed,
    unchanged,
    reposts,
    duplicateDiagnostics: {
      previousExactDuplicates: previous.fingerprints.duplicateCount,
      currentExactDuplicates: current.fingerprints.duplicateCount,
    },
    identityAlgorithm: "zar-jobs-exact-v1",
    contentAlgorithm: "sha256-normalized-selected-fields-v1",
    fuzzyMatching: false,
    networkAccess: false,
    stored: false,
    disclaimer:
      "Reposts require an exact normalized title, company, and location with a different exact identity. Similar wording is not matched.",
  };
}

function parseAlert(content, format) {
  if (format === "rss" || format === "atom") return parseXmlAlert(content, format);
  if (format === "json") return parseJsonAlert(content);
  if (format === "csv") return { title: null, items: parseCsv(content) };
  return { title: null, items: parseLabelledText(content) };
}

function parseXmlAlert(content, format) {
  let parsed;
  try {
    parsed = new XMLParser({
      ignoreAttributes: false,
      processEntities: false,
      trimValues: true,
    }).parse(content);
  } catch {
    throw new Error(`Invalid ${format.toUpperCase()} XML.`);
  }
  if (format === "rss") {
    const channel = parsed?.rss?.channel;
    if (!isPlainObject(channel)) throw new Error("Unsupported RSS document.");
    return { title: asText(channel.title), items: toArray(channel.item) };
  }
  const feed = parsed?.feed;
  if (!isPlainObject(feed)) throw new Error("Unsupported Atom document.");
  return { title: asText(feed.title), items: toArray(feed.entry) };
}

function parseJsonAlert(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON alert content.");
  }
  if (Array.isArray(parsed)) return { title: null, items: parsed };
  if (!isPlainObject(parsed)) throw new Error("JSON alert must be an array or object.");
  const items = [parsed.jobs, parsed.items, parsed.results].find(Array.isArray);
  if (!items) throw new Error("JSON alert object must contain a jobs, items, or results array.");
  return { title: asText(parsed.title) ?? asText(parsed.name), items };
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (inQuotes) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field.length > 0) throw new Error("Malformed CSV quoted field.");
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (inQuotes) throw new Error("CSV contains an unterminated quoted field.");
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value.length > 0)) rows.push(row);
  const nonEmptyRows = rows.filter((values) => values.some((value) => value.trim()));
  if (nonEmptyRows.length < 2) throw new Error("CSV alert requires a header and at least one data row.");
  const headers = nonEmptyRows[0].map((value, index) => {
    const header = normalizeHeader(value.replace(/^\uFEFF/, ""));
    if (!header) throw new Error(`CSV header ${index + 1} is empty.`);
    return header;
  });
  if (new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique.");
  return nonEmptyRows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  ));
}

function parseLabelledText(content) {
  return content.trim().split(/\r?\n\s*\r?\n/).map((block) => {
    const item = {};
    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/^\s*([^:]{1,50}):\s*(.*)$/);
      if (match) item[normalizeHeader(match[1])] = match[2].trim();
    }
    return item;
  });
}

function normalizeAlertItem(item, format, sourceLabel) {
  if (!isPlainObject(item)) return null;
  const normalizedInput = normalizeInputObject(item, format);
  const title = firstAlias(normalizedInput, "title", 200);
  const company = firstAlias(normalizedInput, "company", 200);
  if (!title || !company) return null;

  const rawUrl = firstAlias(normalizedInput, "url", 2048);
  let normalizedUrl = null;
  if (rawUrl) {
    try {
      normalizedUrl = normalizeJobUrl(rawUrl);
    } catch {
      return null;
    }
  }
  return {
    source: sourceLabel
      ?? firstAlias(normalizedInput, "source", 100)
      ?? (normalizedUrl?.portal !== "unknown" ? normalizedUrl?.portal : null)
      ?? `alert-${format}`,
    externalId: firstAlias(normalizedInput, "externalId", 200) ?? normalizedUrl?.externalId ?? null,
    title,
    company,
    location: firstAlias(normalizedInput, "location", 300),
    url: normalizedUrl?.url ?? null,
    publishedAt: firstAlias(normalizedInput, "publishedAt", 100),
    workplaceType: firstAlias(normalizedInput, "workplaceType", 100),
    employmentType: firstAlias(normalizedInput, "employmentType", 100),
    salary: firstAlias(normalizedInput, "salary", 300),
    description: firstAlias(normalizedInput, "description", 100_000),
    evidence: "user-provided-alert",
    verificationStatus: "unverified",
  };
}

function normalizeInputObject(item, format) {
  if (format === "rss") {
    return {
      ...item,
      guid: asText(item.guid),
      author: asText(item.author) ?? asText(item["dc:creator"]),
      link: asText(item.link),
      description: asText(item.description),
      location: asText(item.location),
      pubdate: asText(item.pubDate) ?? asText(item["dc:date"]),
    };
  }
  if (format === "atom") {
    return {
      ...item,
      id: asText(item.id),
      author: asText(item.author?.name) ?? asText(item.author),
      link: atomLink(item.link),
      summary: asText(item.summary) ?? asText(item.content),
      published: asText(item.published) ?? asText(item.updated),
    };
  }
  return Object.fromEntries(Object.entries(item).map(([key, value]) => [normalizeHeader(key), value]));
}

function firstAlias(item, field, maxLength) {
  for (const alias of FIELD_ALIASES[field]) {
    const value = asText(item[alias]);
    if (value && value.length <= maxLength) return value;
  }
  return null;
}

function snapshotIndex(jobs, label) {
  if (!Array.isArray(jobs) || jobs.length > MAX_ITEMS) {
    throw new TypeError(`${label} must be an array with at most ${MAX_ITEMS} jobs.`);
  }
  if (jobs.length === 0) {
    return {
      byFingerprint: new Map(),
      fingerprints: { duplicateCount: 0 },
    };
  }
  const identityJobs = jobs.map((job) => Object.fromEntries(
    Object.entries(job).filter(([, value]) => value !== null && value !== undefined),
  ));
  const fingerprints = fingerprintJobs(identityJobs);
  const byFingerprint = new Map();
  for (const item of fingerprints.items) {
    if (!byFingerprint.has(item.fingerprint)) {
      byFingerprint.set(item.fingerprint, { job: jobs[item.inputIndex], inputIndex: item.inputIndex });
    }
  }
  return { byFingerprint, fingerprints };
}

function snapshotSummary(item, fingerprint) {
  return {
    fingerprint,
    inputIndex: item.inputIndex,
    id: textOrNull(item.job.id),
    title: textOrNull(item.job.title),
    company: textOrNull(item.job.company),
    location: textOrNull(item.job.location),
  };
}

function exactReposts(removed, added) {
  const available = new Map();
  for (const item of added) {
    const key = repostKey(item);
    if (key === null) continue;
    if (!available.has(key)) available.set(key, []);
    available.get(key).push(item);
  }
  const reposts = [];
  for (const previous of removed) {
    const key = repostKey(previous);
    if (key === null) continue;
    const candidates = available.get(key);
    const current = candidates?.shift();
    if (current) {
      reposts.push({
        previousId: previous.id,
        currentId: current.id,
        title: current.title,
        company: current.company,
        location: current.location,
        previousFingerprint: previous.fingerprint,
        currentFingerprint: current.fingerprint,
        match: "exact-title-company-location",
      });
    }
  }
  return reposts;
}

function repostKey(item) {
  if (!item.title || !item.company || !item.location) return null;
  return [item.title, item.company, item.location].map(normalizeText).join("|");
}

function contentHash(job) {
  return createHash("sha256").update(JSON.stringify(Object.fromEntries(
    SNAPSHOT_FIELDS.map((field) => [field, normalizedSnapshotValue(job, field)]),
  ))).digest("hex");
}

function normalizedSnapshotValue(job, field) {
  if (field === "url" && job.url) {
    try {
      return normalizeJobUrl(job.url).url;
    } catch {
      return normalizeText(job.url);
    }
  }
  return normalizeText(job[field]);
}

function compareSnapshotSummaries(left, right) {
  return left.fingerprint.localeCompare(right.fingerprint);
}

function atomLink(value) {
  for (const link of toArray(value)) {
    if (typeof link === "string") return link.trim() || null;
    if (isPlainObject(link) && typeof link["@_href"] === "string"
        && (!link["@_rel"] || link["@_rel"] === "alternate")) {
      return link["@_href"].trim() || null;
    }
  }
  return null;
}

function asText(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isPlainObject(value) && typeof value["#text"] === "string") {
    return value["#text"].trim() || null;
  }
  return null;
}

function normalizeHeader(value) {
  return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLocaleLowerCase("en").replace(/[^a-z0-9_]+/g, "");
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

function boundedText(value, field, maxLength) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > maxLength) {
    throw new TypeError(`${field} must contain between 1 and ${maxLength} characters.`);
  }
  return value.trim();
}

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
