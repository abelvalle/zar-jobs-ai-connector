import assert from "node:assert/strict";
import test from "node:test";

import {
  compareOfferConditions,
  reviewOfferConditions,
} from "../src/jobs/offer-conditions.mjs";

const monthlyOffer = {
  id: "alpha",
  title: "Backend Engineer",
  company: "Alpha",
  sourceText: "Salary: 3,000 EUR gross monthly. 14 payments. Hybrid: 3 remote days. 25 vacation days.",
  conditions: {
    compensation: {
      minimum: 3000,
      currency: "EUR",
      period: "monthly",
      grossNet: "gross",
      paymentsPerYear: 14,
    },
    remoteDaysPerWeek: 3,
    vacationDays: 25,
  },
  evidence: {
    compensation: "Salary: 3,000 EUR gross monthly.",
    remoteDaysPerWeek: "Hybrid: 3 remote days.",
    vacationDays: "25 vacation days.",
  },
};

test("confirms literal evidence and annualizes only with explicit inputs", () => {
  const result = reviewOfferConditions(monthlyOffer);

  assert.equal(result.reviewed.compensation.status, "confirmed");
  assert.equal(result.normalizedCompensation.annualMinimum, 42_000);
  assert.deepEqual(result.normalizedCompensation.explicitAssumptions, ["paymentsPerYear=14"]);
  assert.equal(result.confirmed.remoteDaysPerWeek, 3);
  assert.equal(result.sourceTextReturned, false);
});

test("keeps fabricated or mismatched evidence unverified", () => {
  const offer = structuredClone(monthlyOffer);
  offer.conditions.compensation.minimum = 9000;
  offer.evidence.remoteDaysPerWeek = "Remote work is available.";

  const result = reviewOfferConditions(offer);
  assert.equal(result.reviewed.compensation.status, "unverified");
  assert.equal(result.reviewed.remoteDaysPerWeek.status, "unverified");
  assert.equal(result.normalizedCompensation, null);
  assert.ok(result.unknown.includes("compensation"));
});

test("compares only matching currency and gross-net compensation groups", () => {
  const annualOffer = {
    id: "beta",
    title: "Platform Engineer",
    company: "Beta",
    sourceText: "Annual gross salary: 45k EUR. Remote 2 days. 40 weekly hours. Commute 20 minutes.",
    conditions: {
      compensation: { minimum: 45_000, currency: "EUR", period: "annual", grossNet: "gross" },
      remoteDaysPerWeek: 2,
      weeklyHours: 40,
      commuteMinutes: 20,
    },
    evidence: {
      compensation: "Annual gross salary: 45k EUR.",
      remoteDaysPerWeek: "Remote 2 days.",
      weeklyHours: "40 weekly hours.",
      commuteMinutes: "Commute 20 minutes.",
    },
  };
  const usdOffer = {
    id: "gamma",
    title: "Backend Engineer",
    company: "Gamma",
    sourceText: "Annual salary: 70k USD net.",
    conditions: {
      compensation: { minimum: 70_000, currency: "USD", period: "annual", grossNet: "net" },
    },
    evidence: { compensation: "Annual salary: 70k USD net." },
  };
  const result = compareOfferConditions([monthlyOffer, annualOffer, usdOffer]);

  assert.equal(result.compensationGroups.length, 2);
  const euro = result.compensationGroups.find((group) => group.currency === "EUR");
  assert.deepEqual(euro.leaders, ["beta"]);
  assert.deepEqual(result.leaders.remoteDaysPerWeek.offerIds, ["alpha"]);
  assert.deepEqual(result.leaders.weeklyHours.offerIds, ["beta"]);
  assert.equal(result.ranked, false);
});

test("leaves monthly compensation incomparable without payments per year", () => {
  const offer = structuredClone(monthlyOffer);
  delete offer.conditions.compensation.paymentsPerYear;

  const result = reviewOfferConditions(offer);
  assert.equal(result.normalizedCompensation.comparable, false);
  assert.equal(result.normalizedCompensation.annualMinimum, null);
});

test("rejects invalid ranges, duplicate ids, and oversized comparisons", () => {
  const invalid = structuredClone(monthlyOffer);
  invalid.conditions.compensation.maximum = 2000;
  assert.throws(() => reviewOfferConditions(invalid), /maximum must be at least minimum/);
  assert.throws(
    () => compareOfferConditions([monthlyOffer, monthlyOffer]),
    /Duplicate offer id/,
  );
  assert.throws(
    () => compareOfferConditions(Array.from({ length: 11 }, (_, index) => ({
      ...monthlyOffer,
      id: `offer-${index}`,
    }))),
    /between 2 and 10/,
  );
});
