import { createHash } from "node:crypto";

export const APPLICATION_STATUSES = Object.freeze([
  "saved",
  "preparing",
  "ready",
  "applied",
  "responded",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
  "closed",
]);

const TERMINAL_STATUSES = new Set(["hired", "rejected", "withdrawn", "closed"]);
const NORMAL_TRANSITIONS = Object.freeze({
  saved: ["preparing", "ready", "withdrawn", "closed"],
  preparing: ["ready", "withdrawn", "closed"],
  ready: ["applied", "withdrawn", "closed"],
  applied: ["responded", "interview", "offer", "rejected", "withdrawn", "closed"],
  responded: ["interview", "offer", "rejected", "withdrawn", "closed"],
  interview: ["offer", "rejected", "withdrawn", "closed"],
  offer: ["hired", "rejected", "withdrawn"],
  hired: [],
  rejected: [],
  withdrawn: [],
  closed: [],
});

const DATE_FIELDS = ["createdAt", "updatedAt", "appliedAt", "lastContactAt", "nextActionAt"];
const EDITABLE_FIELDS = ["status", "appliedAt", "lastContactAt", "nextActionAt", "notes"];

export function reviewApplicationTracker(records, asOf) {
  const date = validDate(asOf, "asOf");
  const applications = validateRecords(records);
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  for (const record of applications) byStatus[record.status] += 1;

  const activeRecords = applications.filter((record) => !TERMINAL_STATUSES.has(record.status));
  const followUps = activeRecords
    .filter((record) => record.nextActionAt)
    .map((record) => followUpSummary(record))
    .sort(compareFollowUps);

  return {
    asOf: date,
    metrics: {
      total: applications.length,
      active: activeRecords.length,
      terminal: applications.length - activeRecords.length,
      byStatus,
      funnel: {
        appliedOrLater: applications.filter((record) => record.appliedAt).length,
        interviewOrLater: applications.filter((record) =>
          ["interview", "offer", "hired"].includes(record.status)).length,
        offerOrLater: applications.filter((record) =>
          ["offer", "hired"].includes(record.status)).length,
        hired: byStatus.hired,
      },
    },
    followUps: {
      overdue: followUps.filter((record) => record.nextActionAt < date),
      dueToday: followUps.filter((record) => record.nextActionAt === date),
      upcoming: followUps.filter((record) => record.nextActionAt > date),
      missing: activeRecords
        .filter((record) => !record.nextActionAt)
        .map((record) => followUpSummary(record)),
    },
    method: "deterministic-tracker-review-v1",
    externalDataVerified: false,
    stored: false,
  };
}

export function planApplicationUpdate(records, update, asOf) {
  const date = validDate(asOf, "asOf");
  const applications = validateRecords(records);
  if (!update || typeof update !== "object" || Array.isArray(update)) {
    throw new Error("update must be an object.");
  }
  const id = requiredText(update.id, "update.id", 200);
  const index = applications.findIndex((record) => record.id === id);
  if (index === -1) throw new Error(`Application id not found: ${id}`);
  const changes = validateChanges(update.changes);
  const previous = applications[index];
  const updatedRecord = { ...previous, ...changes, updatedAt: date };
  validateRecord(updatedRecord, index);

  const transition = reviewTransition(previous.status, updatedRecord.status);
  const patch = Object.keys({ ...changes, updatedAt: date })
    .filter((field) => previous[field] !== updatedRecord[field])
    .sort()
    .map((field) => ({
      field,
      before: previous[field] ?? null,
      after: updatedRecord[field] ?? null,
    }));
  if (patch.length === 0) throw new Error("update does not change the application record.");

  const updatedRecords = applications.map((record, recordIndex) =>
    recordIndex === index ? updatedRecord : record);

  return {
    id,
    previousRecord: previous,
    updatedRecord,
    updatedRecords,
    patch,
    transition,
    warnings: buildUpdateWarnings(updatedRecord, transition),
    writePerformed: false,
    externalActionPerformed: false,
    submissionPerformed: false,
    humanReviewRequired: true,
    stored: false,
  };
}

export function exportFollowupCalendar(records, asOf, calendarName = "Zar Jobs Follow-ups") {
  const date = validDate(asOf, "asOf");
  const applications = validateRecords(records);
  const name = requiredText(calendarName, "calendarName", 100);
  const events = applications
    .filter((record) => record.nextActionAt && !TERMINAL_STATUSES.has(record.status))
    .sort(compareFollowUps);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zar Jobs AI Connector//Follow-ups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(name)}`,
  ];

  for (const record of events) {
    const uid = createHash("sha256")
      .update(`${record.id}\0${record.nextActionAt}`)
      .digest("hex")
      .slice(0, 24);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@zar-jobs.local`,
      `DTSTAMP:${date.replaceAll("-", "")}T000000Z`,
      `DTSTART;VALUE=DATE:${record.nextActionAt.replaceAll("-", "")}`,
      `SUMMARY:${escapeIcs(`Follow up: ${record.company} - ${record.role}`)}`,
      `DESCRIPTION:${escapeIcs(`Application ${record.id}; status ${record.status}. Review before any contact.`)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  const calendarText = `${lines.flatMap(foldIcsLine).join("\r\n")}\r\n`;

  return {
    format: "ics",
    mimeType: "text/calendar",
    encoding: "utf-8",
    fileName: "zar-jobs-follow-ups.ics",
    calendarName: name,
    events: events.length,
    calendarText,
    bytes: Buffer.byteLength(calendarText, "utf8"),
    notesIncluded: false,
    externalActionPerformed: false,
    stored: false,
  };
}

function validateRecords(records) {
  if (!Array.isArray(records) || records.length > 500) {
    throw new Error("records must be an array with at most 500 applications.");
  }
  const applications = records.map((record, index) => validateRecord(record, index));
  const seen = new Set();
  for (const record of applications) {
    if (seen.has(record.id)) throw new Error(`duplicate application id: ${record.id}`);
    seen.add(record.id);
  }
  return applications;
}

function validateRecord(record, index) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`records[${index}] must be an object.`);
  }
  const normalized = {
    id: requiredText(record.id, `records[${index}].id`, 200),
    company: requiredText(record.company, `records[${index}].company`, 200),
    role: requiredText(record.role, `records[${index}].role`, 200),
    status: record.status,
    createdAt: validDate(record.createdAt, `records[${index}].createdAt`),
  };
  if (!APPLICATION_STATUSES.includes(normalized.status)) {
    throw new Error(`records[${index}].status is not supported.`);
  }

  for (const field of DATE_FIELDS.slice(1)) {
    if (record[field] !== undefined && record[field] !== null) {
      normalized[field] = validDate(record[field], `records[${index}].${field}`);
    }
  }
  if (record.sourceUrl !== undefined && record.sourceUrl !== null) {
    normalized.sourceUrl = safeHttpsUrl(record.sourceUrl, `records[${index}].sourceUrl`);
  }
  if (record.notes !== undefined && record.notes !== null) {
    normalized.notes = optionalText(record.notes, `records[${index}].notes`, 5_000);
  }
  if (normalized.updatedAt && normalized.updatedAt < normalized.createdAt) {
    throw new Error(`records[${index}].updatedAt cannot precede createdAt.`);
  }
  if (normalized.appliedAt && normalized.appliedAt < normalized.createdAt) {
    throw new Error(`records[${index}].appliedAt cannot precede createdAt.`);
  }
  return normalized;
}

function validateChanges(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new Error("update.changes must be an object.");
  }
  const keys = Object.keys(changes);
  if (keys.length === 0) throw new Error("update.changes must not be empty.");
  const unsupported = keys.filter((key) => !EDITABLE_FIELDS.includes(key));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported update fields: ${unsupported.sort().join(", ")}`);
  }

  const normalized = {};
  if (changes.status !== undefined) {
    if (!APPLICATION_STATUSES.includes(changes.status)) {
      throw new Error("update.changes.status is not supported.");
    }
    normalized.status = changes.status;
  }
  for (const field of ["appliedAt", "lastContactAt", "nextActionAt"]) {
    if (changes[field] !== undefined) {
      normalized[field] = changes[field] === null
        ? null
        : validDate(changes[field], `update.changes.${field}`);
    }
  }
  if (changes.notes !== undefined) {
    normalized.notes = changes.notes === null
      ? null
      : optionalText(changes.notes, "update.changes.notes", 5_000);
  }
  return normalized;
}

function reviewTransition(before, after) {
  if (before === after) {
    return { from: before, to: after, allowed: true, reason: "status unchanged" };
  }
  const allowed = NORMAL_TRANSITIONS[before].includes(after);
  return {
    from: before,
    to: after,
    allowed,
    reason: allowed
      ? "normal forward transition"
      : "not a normal forward transition; confirm the correction manually",
  };
}

function buildUpdateWarnings(record, transition) {
  const warnings = [];
  if (!transition.allowed) warnings.push(transition.reason);
  if (["applied", "responded", "interview", "offer", "hired", "rejected"].includes(record.status)
      && !record.appliedAt) {
    warnings.push("Status suggests an application but appliedAt is missing.");
  }
  if (!TERMINAL_STATUSES.has(record.status) && !record.nextActionAt) {
    warnings.push("Active application has no nextActionAt date.");
  }
  return warnings;
}

function followUpSummary(record) {
  return {
    id: record.id,
    company: record.company,
    role: record.role,
    status: record.status,
    nextActionAt: record.nextActionAt ?? null,
  };
}

function compareFollowUps(left, right) {
  return (left.nextActionAt ?? "9999-12-31").localeCompare(right.nextActionAt ?? "9999-12-31")
    || left.company.localeCompare(right.company, "en", { sensitivity: "base" })
    || left.role.localeCompare(right.role, "en", { sensitivity: "base" });
}

function safeHttpsUrl(value, field) {
  const text = requiredText(value, field, 2048);
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${field} must be an HTTPS URL without embedded credentials.`);
  }
  return parsed.toString();
}

function validDate(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be a valid ISO date (YYYY-MM-DD).`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} must be a valid ISO date (YYYY-MM-DD).`);
  }
  return value;
}

function requiredText(value, field, maxLength) {
  const text = optionalText(value, field, maxLength);
  if (!text) throw new Error(`${field} is required.`);
  return text;
}

function optionalText(value, field, maxLength) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > maxLength) {
    throw new Error(`${field} must contain between 1 and ${maxLength} characters.`);
  }
  return value.trim();
}

function escapeIcs(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldIcsLine(line) {
  const chunks = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character, "utf8");
    const limit = chunks.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      chunks.push(current);
      current = ` ${character}`;
      bytes = 1 + size;
    } else {
      current += character;
      bytes += size;
    }
  }
  chunks.push(current);
  return chunks;
}
