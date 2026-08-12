import { normalizeJobUrl } from "./url-normalizer.mjs";

export function importLinkedInJob({
  url,
  title,
  company,
  location,
  description,
  publishedAt,
  workplaceType,
  employmentType
}) {
  const normalizedUrl = normalizeJobUrl(url);
  if (normalizedUrl.portal !== "linkedin" || normalizedUrl.externalId === null) {
    throw new TypeError("A LinkedIn job URL with a numeric job ID is required.");
  }

  return {
    source: "linkedin",
    externalId: normalizedUrl.externalId,
    title: requiredText(title, "title"),
    company: requiredText(company, "company"),
    location: optionalText(location),
    url: normalizedUrl.url,
    publishedAt: optionalIsoDate(publishedAt),
    workplaceType: optionalText(workplaceType),
    employmentType: optionalText(employmentType),
    description: optionalText(description),
    evidence: "user-provided",
    verificationStatus: "unverified",
    safeNextAction:
      "Open the original LinkedIn URL and confirm that the posting is active before acting on it."
  };
}

function requiredText(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalIsoDate(value) {
  const text = optionalText(value);
  if (text === null) return null;

  const timestamp = Date.parse(text);
  if (Number.isNaN(timestamp)) {
    throw new TypeError("publishedAt must be a valid date and time.");
  }
  return new Date(timestamp).toISOString();
}
