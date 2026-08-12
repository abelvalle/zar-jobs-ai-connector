const INFOJOBS_API_BASE_URL = "https://api.infojobs.net/api/7";
const DEFAULT_TIMEOUT_MS = 10_000;

const ORDER_VALUES = new Set([
  "updated",
  "updated-desc",
  "title",
  "title-desc",
  "city",
  "city-desc",
  "author",
  "author-desc"
]);

export class InfoJobsConfigError extends Error {
  constructor() {
    super(
      "InfoJobs is not configured. Set INFOJOBS_CLIENT_ID and INFOJOBS_CLIENT_SECRET in the MCP server environment."
    );
    this.name = "InfoJobsConfigError";
    this.code = "INFOJOBS_NOT_CONFIGURED";
  }
}

export class InfoJobsApiError extends Error {
  constructor(message, { status = null, apiCode = null } = {}) {
    super(message);
    this.name = "InfoJobsApiError";
    this.code = "INFOJOBS_API_ERROR";
    this.status = status;
    this.apiCode = apiCode;
  }
}

export class InfoJobsClient {
  constructor({
    clientId,
    clientSecret,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS
  }) {
    if (!clientId?.trim() || !clientSecret?.trim()) {
      throw new InfoJobsConfigError();
    }
    if (typeof fetchImpl !== "function") {
      throw new TypeError("A fetch implementation is required.");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new TypeError("timeoutMs must be a positive integer.");
    }

    this.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async searchOffers({
    query,
    provinces = [],
    order = "updated-desc",
    page = 1,
    maxResults = 20
  } = {}) {
    if (query !== undefined && (typeof query !== "string" || !query.trim())) {
      throw new TypeError("query must be a non-empty string when provided.");
    }
    if (!Array.isArray(provinces) || provinces.length > 10) {
      throw new TypeError("provinces must be an array with at most 10 values.");
    }
    if (
      provinces.some(
        (province) => typeof province !== "string" || !province.trim()
      )
    ) {
      throw new TypeError("Each province must be a non-empty string.");
    }
    if (!ORDER_VALUES.has(order)) {
      throw new TypeError("Unsupported InfoJobs result order.");
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new TypeError("page must be a positive integer.");
    }
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) {
      throw new TypeError("maxResults must be an integer between 1 and 50.");
    }

    const url = new URL(`${INFOJOBS_API_BASE_URL}/offer`);
    if (query !== undefined) {
      url.searchParams.set("q", query.trim());
    }
    for (const province of provinces) {
      url.searchParams.append("province", province.trim());
    }
    url.searchParams.set("order", order);
    url.searchParams.set("page", String(page));
    url.searchParams.set("maxResults", String(maxResults));

    const payload = await this.#getJson(url);
    if (!Array.isArray(payload?.offers)) {
      throw new InfoJobsApiError("InfoJobs returned an invalid search response.");
    }

    return {
      source: "infojobs",
      jobs: payload.offers.map(normalizeOfferSummary),
      pagination: {
        totalResults: asInteger(payload.totalResults),
        currentResults: asInteger(payload.currentResults),
        totalPages: asInteger(payload.totalPages),
        currentPage: asInteger(payload.currentPage),
        pageSize: asInteger(payload.pageSize)
      }
    };
  }

  async getOffer(offerId) {
    if (
      typeof offerId !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(offerId)
    ) {
      throw new TypeError(
        "offerId must contain 1 to 100 letters, numbers, underscores, or hyphens."
      );
    }

    const payload = await this.#getJson(
      new URL(`${INFOJOBS_API_BASE_URL}/offer/${encodeURIComponent(offerId)}`)
    );
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new InfoJobsApiError("InfoJobs returned an invalid offer response.");
    }

    return normalizeOfferDetail(payload);
  }

  async #getJson(url) {
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: this.authorization
        },
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      const timedOut = error?.name === "TimeoutError";
      throw new InfoJobsApiError(
        timedOut
          ? "InfoJobs API request timed out."
          : "InfoJobs API request failed before receiving a response."
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new InfoJobsApiError("InfoJobs returned a non-JSON response.", {
        status: response.status
      });
    }

    if (!response.ok) {
      const apiCode = safeApiCode(payload);
      const suffix = apiCode === null ? "" : ` (API code ${apiCode})`;
      throw new InfoJobsApiError(
        `InfoJobs API request failed with HTTP ${response.status}${suffix}.`,
        { status: response.status, apiCode }
      );
    }

    return payload;
  }
}

export function createInfoJobsClientFromEnv(
  environment = process.env,
  options = {}
) {
  return new InfoJobsClient({
    clientId: environment.INFOJOBS_CLIENT_ID,
    clientSecret: environment.INFOJOBS_CLIENT_SECRET,
    ...options
  });
}

function normalizeOfferSummary(offer) {
  return {
    source: "infojobs",
    externalId: asString(offer?.id),
    title: asString(offer?.title),
    company: asString(offer?.author?.name),
    location: joinLocation(offer?.city, offer?.province?.value),
    url: asString(offer?.link),
    publishedAt: asString(offer?.published),
    updatedAt: asString(offer?.updated),
    category: asString(offer?.category?.value),
    contractType: asString(offer?.contractType?.value),
    workday: asString(offer?.workDay?.value),
    experience: asString(offer?.experienceMin?.value),
    salary: normalizeSearchSalary(offer),
    requirements: asString(offer?.requirementMin)
  };
}

function normalizeOfferDetail(offer) {
  return {
    source: "infojobs",
    externalId: asString(offer.id),
    title: asString(offer.title),
    company: asString(offer.profile?.name),
    location: joinLocation(offer.city, offer.province?.value),
    url: asString(offer.link),
    publishedAt: asString(offer.creationDate),
    updatedAt: asString(offer.updateDate),
    category: asString(offer.category?.value),
    contractType: asString(offer.contractType?.value),
    workday: asString(offer.journey?.value),
    experience: asString(offer.experienceMin?.value),
    salary: offer.showPay ? normalizeDetailSalary(offer) : null,
    description: asString(offer.description),
    requirements: asString(offer.minRequirements),
    desiredRequirements: asString(offer.desiredRequirements),
    vacancies: asInteger(offer.vacancies),
    active: asBoolean(offer.active),
    archived: asBoolean(offer.archived),
    deleted: asBoolean(offer.deleted),
    availableForVisualization: asBoolean(offer.availableForVisualization)
  };
}

function normalizeSearchSalary(offer) {
  const minimum = asString(offer?.salaryMin?.value);
  const maximum = asString(offer?.salaryMax?.value);
  const period = asString(offer?.salaryPeriod?.value);
  if (minimum === null && maximum === null && period === null) {
    return null;
  }
  return { minimum, maximum, period };
}

function normalizeDetailSalary(offer) {
  const minimum = asInteger(offer?.minPay?.amount);
  const maximum = asInteger(offer?.maxPay?.amount);
  const period =
    asString(offer?.minPay?.periodValue) ??
    asString(offer?.maxPay?.periodValue);
  if (minimum === null && maximum === null && period === null) {
    return null;
  }
  return { minimum, maximum, period };
}

function joinLocation(city, province) {
  const parts = [asString(city), asString(province)].filter(Boolean);
  return [...new Set(parts)].join(", ") || null;
}

function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return null;
}

function asBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function safeApiCode(payload) {
  const candidate = payload?.error?.code ?? payload?.errorCode ?? payload?.code;
  if (
    (typeof candidate === "number" && Number.isFinite(candidate)) ||
    (typeof candidate === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(candidate))
  ) {
    return candidate;
  }
  return null;
}
