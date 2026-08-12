const TRACKING_PARAMETERS = new Set([
  "trk",
  "trackingid",
  "refid",
  "ref",
  "src",
  "source",
  "campaign"
]);

function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function detectPortal(hostname) {
  if (matchesDomain(hostname, "infojobs.net")) return "infojobs";
  if (matchesDomain(hostname, "tecnoempleo.com")) return "tecnoempleo";
  if (matchesDomain(hostname, "linkedin.com")) return "linkedin";
  return "unknown";
}

function extractExternalId(portal, pathname) {
  if (portal !== "linkedin") return null;
  return pathname.match(/\/jobs\/view\/(\d+)/i)?.[1] ?? null;
}

export function normalizeJobUrl(input) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new TypeError("A non-empty job URL is required.");
  }

  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new TypeError("The job URL is invalid.");
  }

  if (parsed.protocol !== "https:") {
    throw new TypeError("Only HTTPS job URLs are accepted.");
  }
  if (parsed.username || parsed.password) {
    throw new TypeError("Job URLs must not contain credentials.");
  }

  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.startsWith("utm_") || TRACKING_PARAMETERS.has(normalizedKey)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();

  const portal = detectPortal(parsed.hostname.toLowerCase());
  return {
    url: parsed.toString(),
    portal,
    supported: portal !== "unknown",
    externalId: extractExternalId(portal, parsed.pathname)
  };
}
