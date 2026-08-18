export const COMPENSATION_PERIODS = Object.freeze(["annual", "monthly", "hourly"]);
export const GROSS_NET_VALUES = Object.freeze(["gross", "net", "unknown"]);

const CONDITION_KEYS = Object.freeze([
  "compensation", "variablePercent", "remoteDaysPerWeek", "weeklyHours", "vacationDays",
  "contractType", "location", "commuteMinutes", "benefits",
]);
const NUMERIC_CONDITIONS = Object.freeze({
  variablePercent: "variablePercent",
  remoteDaysPerWeek: "remoteDaysPerWeek",
  weeklyHours: "weeklyHours",
  vacationDays: "vacationDays",
  commuteMinutes: "commuteMinutes",
});

export function reviewOfferConditions(offer) {
  const validated = validateOffer(offer);
  const reviewed = {};
  const confirmed = {};
  const unknown = [];

  for (const key of CONDITION_KEYS) {
    if (validated.conditions[key] === undefined) {
      reviewed[key] = { status: "unknown", evidence: null, reason: "No value was provided." };
      unknown.push(key);
      continue;
    }
    const evidence = validated.evidence[key];
    const evidenceStatus = verifyEvidence(
      validated.sourceText,
      evidence,
      key,
      validated.conditions[key],
    );
    reviewed[key] = evidenceStatus;
    if (evidenceStatus.status === "confirmed") {
      confirmed[key] = structuredClone(validated.conditions[key]);
    } else {
      unknown.push(key);
    }
  }

  const compensation = confirmed.compensation
    ? normalizeCompensation(confirmed.compensation)
    : null;
  return {
    id: validated.id,
    title: validated.title,
    company: validated.company,
    reviewed,
    confirmed,
    normalizedCompensation: compensation,
    unknown,
    confirmedCount: Object.keys(confirmed).length,
    comparisonReady: Object.keys(confirmed).length > 0,
    sourceTextReturned: false,
    method: "literal-evidence-and-explicit-normalization-v1",
    decisionMade: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "Literal evidence and explicit arithmetic do not verify the posting, tax treatment, legal meaning, or total value. No currency or gross/net conversion is performed.",
  };
}

export function compareOfferConditions(offers) {
  if (!Array.isArray(offers) || offers.length < 2 || offers.length > 10) {
    throw new TypeError("offers must contain between 2 and 10 items");
  }
  const reviews = offers.map(reviewOfferConditions);
  const ids = new Set();
  for (const [index, review] of reviews.entries()) {
    const id = review.id ?? `offer-${index + 1}`;
    if (ids.has(id)) throw new Error(`Duplicate offer id: ${id}`);
    ids.add(id);
    review.id = id;
  }

  const matrix = reviews.map((review) => ({
    id: review.id,
    title: review.title,
    company: review.company,
    compensation: review.normalizedCompensation,
    variablePercent: valueOrNull(review.confirmed.variablePercent),
    remoteDaysPerWeek: valueOrNull(review.confirmed.remoteDaysPerWeek),
    weeklyHours: valueOrNull(review.confirmed.weeklyHours),
    vacationDays: valueOrNull(review.confirmed.vacationDays),
    contractType: valueOrNull(review.confirmed.contractType),
    location: valueOrNull(review.confirmed.location),
    commuteMinutes: valueOrNull(review.confirmed.commuteMinutes),
    benefits: review.confirmed.benefits ?? null,
    unknown: review.unknown,
  }));

  return {
    offers: matrix,
    compensationGroups: compensationGroups(matrix),
    leaders: {
      remoteDaysPerWeek: numericLeaders(matrix, "remoteDaysPerWeek", "max"),
      vacationDays: numericLeaders(matrix, "vacationDays", "max"),
      weeklyHours: numericLeaders(matrix, "weeklyHours", "min"),
      commuteMinutes: numericLeaders(matrix, "commuteMinutes", "min"),
    },
    evidenceReview: reviews.map((review) => ({
      id: review.id,
      reviewed: review.reviewed,
      confirmedCount: review.confirmedCount,
      unknown: review.unknown,
    })),
    comparisonLimitations: [
      "Annual compensation is compared only inside the same currency and gross/net group.",
      "Benefits and contract wording are displayed but not assigned a monetary value.",
      "Missing or unsupported evidence remains unknown and cannot lose or win a comparison.",
    ],
    ranked: false,
    decisionMade: false,
    humanReviewRequired: true,
    stored: false,
  };
}

function validateOffer(offer) {
  if (!isPlainObject(offer)) throw new TypeError("offer must be an object");
  assertText(offer.title, "offer.title", 200);
  assertText(offer.company, "offer.company", 200);
  assertText(offer.sourceText, "offer.sourceText", 100_000);
  if (offer.id !== undefined) assertText(offer.id, "offer.id", 200);
  if (!isPlainObject(offer.conditions)) throw new TypeError("offer.conditions must be an object");
  if (!isPlainObject(offer.evidence)) throw new TypeError("offer.evidence must be an object");
  const unknownConditions = Object.keys(offer.conditions).filter((key) => !CONDITION_KEYS.includes(key));
  const unknownEvidence = Object.keys(offer.evidence).filter((key) => !CONDITION_KEYS.includes(key));
  if (unknownConditions.length > 0) throw new Error(`Unsupported condition: ${unknownConditions[0]}`);
  if (unknownEvidence.length > 0) throw new Error(`Unsupported evidence field: ${unknownEvidence[0]}`);
  if (Object.keys(offer.conditions).length === 0) {
    throw new Error("offer.conditions must contain at least one condition");
  }

  const conditions = structuredClone(offer.conditions);
  validateCompensation(conditions.compensation);
  assertOptionalNumber(conditions.variablePercent, "conditions.variablePercent", 0, 100);
  assertOptionalNumber(conditions.remoteDaysPerWeek, "conditions.remoteDaysPerWeek", 0, 7);
  assertOptionalNumber(conditions.weeklyHours, "conditions.weeklyHours", 1, 100);
  assertOptionalNumber(conditions.vacationDays, "conditions.vacationDays", 0, 366);
  assertOptionalNumber(conditions.commuteMinutes, "conditions.commuteMinutes", 0, 1_440);
  for (const key of ["contractType", "location"]) {
    if (conditions[key] !== undefined) assertText(conditions[key], `conditions.${key}`, 300);
  }
  if (conditions.benefits !== undefined) {
    if (!Array.isArray(conditions.benefits) || conditions.benefits.length > 50) {
      throw new TypeError("conditions.benefits must be an array with at most 50 items");
    }
    conditions.benefits.forEach((item, index) => assertText(item, `conditions.benefits[${index}]`, 300));
  }
  const evidence = structuredClone(offer.evidence);
  for (const [key, value] of Object.entries(evidence)) {
    assertText(value, `evidence.${key}`, 1_000);
  }

  return {
    id: offer.id?.trim() ?? null,
    title: offer.title.trim(),
    company: offer.company.trim(),
    sourceText: offer.sourceText,
    conditions,
    evidence,
  };
}

function validateCompensation(compensation) {
  if (compensation === undefined) return;
  if (!isPlainObject(compensation)) throw new TypeError("conditions.compensation must be an object");
  const allowed = new Set([
    "minimum", "maximum", "currency", "period", "grossNet", "paymentsPerYear",
    "hoursPerWeek", "weeksPerYear",
  ]);
  const unknown = Object.keys(compensation).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`Unsupported compensation field: ${unknown[0]}`);
  assertNumber(compensation.minimum, "conditions.compensation.minimum", 0, 100_000_000);
  if (compensation.maximum !== undefined) {
    assertNumber(compensation.maximum, "conditions.compensation.maximum", 0, 100_000_000);
    if (compensation.maximum < compensation.minimum) {
      throw new Error("conditions.compensation.maximum must be at least minimum");
    }
  }
  if (typeof compensation.currency !== "string" || !/^[A-Z]{3}$/.test(compensation.currency)) {
    throw new TypeError("conditions.compensation.currency must be a three-letter uppercase code");
  }
  if (!COMPENSATION_PERIODS.includes(compensation.period)) {
    throw new TypeError(`conditions.compensation.period must use one of: ${COMPENSATION_PERIODS.join(", ")}`);
  }
  if (!GROSS_NET_VALUES.includes(compensation.grossNet ?? "unknown")) {
    throw new TypeError(`conditions.compensation.grossNet must use one of: ${GROSS_NET_VALUES.join(", ")}`);
  }
  assertOptionalNumber(compensation.paymentsPerYear, "conditions.compensation.paymentsPerYear", 1, 24);
  assertOptionalNumber(compensation.hoursPerWeek, "conditions.compensation.hoursPerWeek", 1, 100);
  assertOptionalNumber(compensation.weeksPerYear, "conditions.compensation.weeksPerYear", 1, 53);
}

function verifyEvidence(sourceText, evidence, key, value) {
  if (typeof evidence !== "string" || !evidence.trim()) {
    return { status: "unverified", evidence: null, reason: "No literal evidence was provided." };
  }
  const quote = evidence.trim();
  if (!normalizeText(sourceText).includes(normalizeText(quote))) {
    return { status: "unverified", evidence: quote, reason: "The evidence is not a literal excerpt of sourceText." };
  }
  const expectedNumbers = key === "compensation"
    ? [value.minimum, value.maximum].filter((item) => item !== undefined)
    : Object.hasOwn(NUMERIC_CONDITIONS, key) ? [value] : [];
  const evidenceNumbers = extractNumbers(quote);
  if (expectedNumbers.some((expected) => !evidenceNumbers.some((actual) => numbersMatch(actual, expected)))) {
    return { status: "unverified", evidence: quote, reason: "The evidence does not contain the supplied numeric value." };
  }
  return { status: "confirmed", evidence: quote, reason: "Literal evidence found; human interpretation remains required." };
}

function normalizeCompensation(compensation) {
  const assumptions = [];
  let multiplier = null;
  if (compensation.period === "annual") multiplier = 1;
  if (compensation.period === "monthly") {
    if (compensation.paymentsPerYear !== undefined) {
      multiplier = compensation.paymentsPerYear;
      assumptions.push(`paymentsPerYear=${compensation.paymentsPerYear}`);
    }
  }
  if (compensation.period === "hourly") {
    if (compensation.hoursPerWeek !== undefined && compensation.weeksPerYear !== undefined) {
      multiplier = compensation.hoursPerWeek * compensation.weeksPerYear;
      assumptions.push(`hoursPerWeek=${compensation.hoursPerWeek}`);
      assumptions.push(`weeksPerYear=${compensation.weeksPerYear}`);
    }
  }
  return {
    currency: compensation.currency,
    grossNet: compensation.grossNet ?? "unknown",
    sourcePeriod: compensation.period,
    sourceMinimum: compensation.minimum,
    sourceMaximum: compensation.maximum ?? compensation.minimum,
    annualMinimum: multiplier === null ? null : roundMoney(compensation.minimum * multiplier),
    annualMaximum: multiplier === null
      ? null
      : roundMoney((compensation.maximum ?? compensation.minimum) * multiplier),
    comparable: multiplier !== null,
    explicitAssumptions: assumptions,
  };
}

function compensationGroups(matrix) {
  const groups = new Map();
  for (const offer of matrix) {
    const compensation = offer.compensation;
    if (!compensation?.comparable) continue;
    const key = `${compensation.currency}:${compensation.grossNet}`;
    if (!groups.has(key)) {
      groups.set(key, {
        currency: compensation.currency,
        grossNet: compensation.grossNet,
        offers: [],
      });
    }
    groups.get(key).offers.push({
      id: offer.id,
      annualMinimum: compensation.annualMinimum,
      annualMaximum: compensation.annualMaximum,
    });
  }
  return [...groups.values()].map((group) => {
    const best = Math.max(...group.offers.map((offer) => offer.annualMinimum));
    return {
      ...group,
      highestAnnualMinimum: best,
      leaders: group.offers.filter((offer) => offer.annualMinimum === best).map((offer) => offer.id),
    };
  });
}

function numericLeaders(matrix, key, direction) {
  const values = matrix.filter((offer) => typeof offer[key] === "number");
  if (values.length === 0) return { value: null, offerIds: [], comparedOffers: 0 };
  const selected = direction === "max"
    ? Math.max(...values.map((offer) => offer[key]))
    : Math.min(...values.map((offer) => offer[key]));
  return {
    value: selected,
    offerIds: values.filter((offer) => offer[key] === selected).map((offer) => offer.id),
    comparedOffers: values.length,
  };
}

function extractNumbers(text) {
  const results = [];
  for (const match of text.matchAll(/\d+(?:[.,]\d+)?\s*[kK]?/g)) {
    const raw = match[0].replace(/\s/g, "");
    const thousands = /k$/i.test(raw);
    const withoutSuffix = raw.replace(/k$/i, "");
    const numeric = /^\d+[.,]\d{3}$/.test(withoutSuffix)
      ? withoutSuffix.replace(/[.,]/, "")
      : withoutSuffix.replace(",", ".");
    const value = Number(numeric);
    if (Number.isFinite(value)) results.push(thousands ? value * 1_000 : value);
  }
  return results;
}

function numbersMatch(left, right) {
  return Math.abs(left - right) <= Math.max(0.01, Math.abs(right) * 0.000001);
}

function normalizeText(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function valueOrNull(value) {
  return value === undefined ? null : value;
}

function assertText(value, field, maximum) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > maximum) {
    throw new TypeError(`${field} must contain between 1 and ${maximum} characters`);
  }
}

function assertOptionalNumber(value, field, minimum, maximum) {
  if (value !== undefined) assertNumber(value, field, minimum, maximum);
}

function assertNumber(value, field, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${field} must be a number between ${minimum} and ${maximum}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
