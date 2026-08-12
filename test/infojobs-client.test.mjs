import assert from "node:assert/strict";
import test from "node:test";

import {
  createInfoJobsClientFromEnv,
  InfoJobsApiError,
  InfoJobsClient,
  InfoJobsConfigError
} from "../src/portals/infojobs-client.mjs";

const SEARCH_FIXTURE = {
  currentPage: 2,
  pageSize: 2,
  totalResults: 12,
  currentResults: 1,
  totalPages: 6,
  offers: [
    {
      id: "offer-123",
      title: "Backend Engineer",
      city: "Zaragoza",
      province: { value: "Zaragoza" },
      link: "https://www.infojobs.net/zaragoza/backend-engineer/of-i123",
      category: { value: "Informática y telecomunicaciones" },
      contractType: { value: "Indefinido" },
      workDay: { value: "Completa" },
      experienceMin: { value: "Al menos 3 años" },
      salaryMin: { value: "30.000 €" },
      salaryMax: { value: "36.000 €" },
      salaryPeriod: { value: "Bruto/año" },
      published: "2026-08-10T09:00:00Z",
      updated: "2026-08-12T09:00:00Z",
      author: { name: "Example Tech" },
      requirementMin: "Node.js"
    }
  ]
};

const DETAIL_FIXTURE = {
  id: "offer-123",
  title: "Backend Engineer",
  city: "Zaragoza",
  province: { value: "Zaragoza" },
  link: "https://www.infojobs.net/zaragoza/backend-engineer/of-i123",
  category: { value: "Informática y telecomunicaciones" },
  contractType: { value: "Indefinido" },
  journey: { value: "Completa" },
  experienceMin: { value: "Al menos 3 años" },
  creationDate: "2026-08-10T09:00:00Z",
  updateDate: "2026-08-12T09:00:00Z",
  profile: { name: "Example Tech" },
  showPay: true,
  minPay: { amount: 30000, periodValue: "Bruto/año" },
  maxPay: { amount: 36000, periodValue: "Bruto/año" },
  description: "External job description",
  minRequirements: "Node.js",
  desiredRequirements: "MCP",
  vacancies: 2,
  active: true,
  archived: false,
  deleted: false,
  availableForVisualization: true
};

test("searches the official endpoint with Basic authentication and pagination", async () => {
  const calls = [];
  const client = new InfoJobsClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse(SEARCH_FIXTURE);
    }
  });

  const result = await client.searchOffers({
    query: "backend engineer",
    provinces: ["zaragoza", "madrid"],
    order: "updated-desc",
    page: 2,
    maxResults: 2
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, "https://api.infojobs.net");
  assert.equal(calls[0].url.pathname, "/api/7/offer");
  assert.equal(calls[0].url.searchParams.get("q"), "backend engineer");
  assert.deepEqual(calls[0].url.searchParams.getAll("province"), [
    "zaragoza",
    "madrid"
  ]);
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(calls[0].url.searchParams.get("maxResults"), "2");
  assert.equal(
    calls[0].options.headers.Authorization,
    `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`
  );
  assert.equal(result.pagination.totalResults, 12);
  assert.equal(result.jobs[0].source, "infojobs");
  assert.equal(result.jobs[0].company, "Example Tech");
  assert.equal(result.jobs[0].location, "Zaragoza");
  assert.deepEqual(result.jobs[0].salary, {
    minimum: "30.000 €",
    maximum: "36.000 €",
    period: "Bruto/año"
  });
});

test("gets and normalizes an offer detail", async () => {
  let requestedUrl;
  const client = new InfoJobsClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl: async (url) => {
      requestedUrl = url;
      return jsonResponse(DETAIL_FIXTURE);
    }
  });

  const result = await client.getOffer("offer-123");

  assert.equal(requestedUrl.pathname, "/api/7/offer/offer-123");
  assert.equal(result.externalId, "offer-123");
  assert.equal(result.description, "External job description");
  assert.deepEqual(result.salary, {
    minimum: 30000,
    maximum: 36000,
    period: "Bruto/año"
  });
  assert.equal(result.active, true);
});

test("rejects missing credentials before a network request", () => {
  assert.throws(
    () => createInfoJobsClientFromEnv({}),
    (error) =>
      error instanceof InfoJobsConfigError &&
      error.code === "INFOJOBS_NOT_CONFIGURED"
  );
});

test("enforces the local result limit", async () => {
  let called = false;
  const client = new InfoJobsClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl: async () => {
      called = true;
      return jsonResponse(SEARCH_FIXTURE);
    }
  });

  await assert.rejects(
    () => client.searchOffers({ maxResults: 51 }),
    /between 1 and 50/
  );
  assert.equal(called, false);
});

test("returns a sanitized API error without response text or credentials", async () => {
  const client = new InfoJobsClient({
    clientId: "sensitive-client",
    clientSecret: "sensitive-secret",
    fetchImpl: async () =>
      jsonResponse(
        {
          error: {
            code: 305,
            message: "do not expose sensitive-secret"
          }
        },
        400
      )
  });

  await assert.rejects(
    () => client.searchOffers(),
    (error) => {
      assert.ok(error instanceof InfoJobsApiError);
      assert.equal(error.status, 400);
      assert.equal(error.apiCode, 305);
      assert.doesNotMatch(error.message, /sensitive/);
      assert.match(error.message, /HTTP 400/);
      return true;
    }
  );
});

test("rejects invalid offer identifiers without calling the API", async () => {
  let called = false;
  const client = new InfoJobsClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl: async () => {
      called = true;
      return jsonResponse(DETAIL_FIXTURE);
    }
  });

  await assert.rejects(() => client.getOffer("../secret"), /offerId/);
  assert.equal(called, false);
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
