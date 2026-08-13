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
  if (matchesDomain(hostname, "indeed.com")) return "indeed";
  return "unknown";
}

function extractExternalId(portal, pathname, searchParams) {
  if (portal === "linkedin") {
    return (
      pathname.match(/\/jobs\/view\/(\d+)/i)?.[1] ??
      searchParams.get("currentJobId")?.match(/^\d+$/)?.[0] ??
      null
    );
  }
  if (portal === "indeed" && /^\/viewjob\/?$/i.test(pathname)) {
    return searchParams.get("jk")?.match(/^[A-Za-z0-9_-]{6,100}$/)?.[0] ?? null;
  }
  return null;
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
  const portal = detectPortal(parsed.hostname.toLowerCase());
  if (portal === "indeed") {
    const jobKey = extractExternalId(portal, parsed.pathname, parsed.searchParams);
    parsed.search = jobKey === null ? "" : `?jk=${encodeURIComponent(jobKey)}`;
  }
  for (const key of [...parsed.searchParams.keys()]) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.startsWith("utm_") || TRACKING_PARAMETERS.has(normalizedKey)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();

  return {
    url: parsed.toString(),
    portal,
    supported: portal !== "unknown",
    externalId: extractExternalId(portal, parsed.pathname, parsed.searchParams)
  };
}
