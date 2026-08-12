import { XMLParser } from "fast-xml-parser";

import { normalizeJobUrl } from "./url-normalizer.mjs";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_FEED_BYTES = 2_000_000;

export class TecnoempleoRssConfigError extends Error {
  constructor(message = "Tecnoempleo RSS is not configured. Set TECNOEMPLEO_RSS_URL in the MCP server environment.") {
    super(message);
    this.name = "TecnoempleoRssConfigError";
    this.code = "TECNOEMPLEO_RSS_NOT_CONFIGURED";
  }
}

export class TecnoempleoRssError extends Error {
  constructor(message, { status = null } = {}) {
    super(message);
    this.name = "TecnoempleoRssError";
    this.code = "TECNOEMPLEO_RSS_ERROR";
    this.status = status;
  }
}

export class TecnoempleoRssClient {
  constructor({ feedUrl, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    this.feedUrl = validateFeedUrl(feedUrl);
    if (typeof fetchImpl !== "function") {
      throw new TypeError("A fetch implementation is required.");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new TypeError("timeoutMs must be a positive integer.");
    }

    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async listJobs({ limit = 20 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new TypeError("limit must be an integer between 1 and 50.");
    }

    let response;
    try {
      response = await this.fetchImpl(this.feedUrl, {
        method: "GET",
        headers: {
          Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8"
        },
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      const timedOut = error?.name === "TimeoutError";
      throw new TecnoempleoRssError(
        timedOut
          ? "Tecnoempleo RSS request timed out."
          : "Tecnoempleo RSS request failed before receiving a response."
      );
    }

    if (!response.ok) {
      throw new TecnoempleoRssError(
        `Tecnoempleo RSS request failed with HTTP ${response.status}.`,
        { status: response.status }
      );
    }

    const xml = await response.text();
    if (Buffer.byteLength(xml, "utf8") > MAX_FEED_BYTES) {
      throw new TecnoempleoRssError("Tecnoempleo RSS response exceeded the 2 MB safety limit.");
    }

    const channel = parseChannel(xml);
    const items = toArray(channel.item);
    const normalized = [];
    let skippedItems = 0;

    for (const item of items) {
      const job = normalizeItem(item);
      if (job === null) {
        skippedItems += 1;
        continue;
      }
      normalized.push(job);
      if (normalized.length === limit) {
        break;
      }
    }

    return {
      source: "tecnoempleo",
      jobs: normalized,
      feed: {
        title: asText(channel.title),
        updatedAt: asText(channel.lastBuildDate) ?? asText(channel.pubDate)
      },
      diagnostics: {
        receivedItems: items.length,
        returnedItems: normalized.length,
        skippedItems
      }
    };
  }
}

export function createTecnoempleoRssClientFromEnv(
  environment = process.env,
  options = {}
) {
  return new TecnoempleoRssClient({
    feedUrl: environment.TECNOEMPLEO_RSS_URL,
    ...options
  });
}

function validateFeedUrl(feedUrl) {
  if (typeof feedUrl !== "string" || !feedUrl.trim()) {
    throw new TecnoempleoRssConfigError();
  }

  let parsed;
  try {
    parsed = new URL(feedUrl.trim());
  } catch {
    throw new TecnoempleoRssConfigError("TECNOEMPLEO_RSS_URL is invalid.");
  }

  if (parsed.protocol !== "https:") {
    throw new TecnoempleoRssConfigError("TECNOEMPLEO_RSS_URL must use HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new TecnoempleoRssConfigError(
      "TECNOEMPLEO_RSS_URL must not contain embedded credentials."
    );
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "tecnoempleo.com" && !hostname.endsWith(".tecnoempleo.com")) {
    throw new TecnoempleoRssConfigError(
      "TECNOEMPLEO_RSS_URL must point to tecnoempleo.com."
    );
  }

  return parsed;
}

function parseChannel(xml) {
  let parsed;
  try {
    parsed = new XMLParser({
      ignoreAttributes: false,
      processEntities: false,
      trimValues: true
    }).parse(xml);
  } catch {
    throw new TecnoempleoRssError("Tecnoempleo returned invalid RSS XML.");
  }

  const channel = parsed?.rss?.channel;
  if (!channel || typeof channel !== "object" || Array.isArray(channel)) {
    throw new TecnoempleoRssError("Tecnoempleo returned an unsupported RSS document.");
  }
  return channel;
}

function normalizeItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }

  const rawUrl = asText(item.link);
  if (rawUrl === null) {
    return null;
  }

  let normalizedUrl;
  try {
    normalizedUrl = normalizeJobUrl(rawUrl);
  } catch {
    return null;
  }
  if (normalizedUrl.portal !== "tecnoempleo") {
    return null;
  }

  return {
    source: "tecnoempleo",
    externalId: safeExternalId(item.guid) ?? normalizedUrl.externalId,
    title: asText(item.title),
    company: asText(item.author) ?? asText(item["dc:creator"]),
    location: asText(item.location),
    url: normalizedUrl.url,
    publishedAt: asText(item.pubDate) ?? asText(item["dc:date"]),
    description: asText(item.description),
    categories: toArray(item.category).map(asText).filter(Boolean),
    evidence: "user-authorized-rss-alert"
  };
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function asText(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object" && typeof value["#text"] === "string") {
    return value["#text"].trim() || null;
  }
  return null;
}

function safeExternalId(value) {
  const text = asText(value);
  return text !== null && /^[A-Za-z0-9_-]{1,200}$/.test(text) ? text : null;
}
