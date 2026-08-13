import { normalizeJobUrl } from "./url-normalizer.mjs";

export function importIndeedJob({
  url,
  title,
  company,
  location,
  description,
  publishedAt,
  workplaceType,
  employmentType,
}) {
  const normalizedUrl = normalizeJobUrl(url);
  if (normalizedUrl.portal !== "indeed" || normalizedUrl.externalId === null) {
    throw new TypeError("An Indeed viewjob URL with a valid jk job key is required.");
  }

  return {
    source: "indeed",
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
      "Open the original Indeed URL and confirm that the posting is active before acting on it.",
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
