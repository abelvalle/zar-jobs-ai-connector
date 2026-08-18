import assert from "node:assert/strict";
import test from "node:test";

import {
  exportFollowupCalendar,
  planApplicationUpdate,
  reviewApplicationTracker,
} from "../src/tracking/application-tracker.mjs";

const records = [
  {
    id: "app-001",
    company: "Example Tech",
    role: "Backend Engineer",
    status: "applied",
    createdAt: "2026-08-01",
    appliedAt: "2026-08-02",
    nextActionAt: "2026-08-20",
    notes: "Private note that must never enter the calendar.",
  },
  {
    id: "app-002",
    company: "Second Corp",
    role: "Platform Engineer",
    status: "interview",
    createdAt: "2026-07-20",
    appliedAt: "2026-07-22",
    nextActionAt: "2026-08-17",
  },
  {
    id: "app-003",
    company: "Closed Corp",
    role: "Software Engineer",
    status: "rejected",
    createdAt: "2026-07-01",
    appliedAt: "2026-07-03",
  },
];

test("reviews tracker metrics using an explicit deterministic date", () => {
  const result = reviewApplicationTracker(records, "2026-08-18");

  assert.equal(result.metrics.total, 3);
  assert.equal(result.metrics.active, 2);
  assert.equal(result.metrics.terminal, 1);
  assert.equal(result.metrics.byStatus.interview, 1);
  assert.equal(result.metrics.funnel.appliedOrLater, 3);
  assert.equal(result.metrics.funnel.interviewOrLater, 1);
  assert.equal(result.followUps.overdue[0].id, "app-002");
  assert.equal(result.followUps.upcoming[0].id, "app-001");
  assert.equal(result.stored, false);
});

test("plans an immutable explicit update and exposes transition review", () => {
  const before = structuredClone(records);
  const result = planApplicationUpdate(
    records,
    {
      id: "app-001",
      changes: {
        status: "interview",
        lastContactAt: "2026-08-18",
        nextActionAt: "2026-08-25",
      },
    },
    "2026-08-18",
  );

  assert.deepEqual(records, before);
  assert.equal(result.updatedRecord.status, "interview");
  assert.equal(result.updatedRecord.updatedAt, "2026-08-18");
  assert.equal(result.transition.allowed, true);
  assert.ok(result.patch.some((change) => change.field === "status"));
  assert.equal(result.writePerformed, false);
  assert.equal(result.externalActionPerformed, false);
  assert.equal(result.humanReviewRequired, true);
});

test("flags unusual backwards transitions instead of hiding them", () => {
  const result = planApplicationUpdate(
    records,
    { id: "app-002", changes: { status: "saved" } },
    "2026-08-18",
  );

  assert.equal(result.transition.allowed, false);
  assert.match(result.transition.reason, /not a normal forward transition/);
});

test("exports portable all-day follow-up events without notes", () => {
  const result = exportFollowupCalendar(records, "2026-08-18", "Zar Jobs Follow-ups");

  assert.equal(result.format, "ics");
  assert.equal(result.mimeType, "text/calendar");
  assert.equal(result.events, 2);
  assert.match(result.calendarText, /BEGIN:VCALENDAR\r\n/);
  assert.match(result.calendarText, /DTSTART;VALUE=DATE:20260817/);
  assert.match(result.calendarText, /SUMMARY:Follow up: Second Corp - Platform Engineer/);
  assert.doesNotMatch(result.calendarText, /private note/i);
  assert.equal(result.stored, false);
});

test("rejects duplicate IDs and invalid dates", () => {
  assert.throws(
    () => reviewApplicationTracker([records[0], records[0]], "2026-08-18"),
    /duplicate application id/,
  );
  assert.throws(
    () => reviewApplicationTracker(records, "2026-02-30"),
    /asOf must be a valid ISO date/,
  );
});
