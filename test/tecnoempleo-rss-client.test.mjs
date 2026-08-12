import assert from "node:assert/strict";
import test from "node:test";

import {
  createTecnoempleoRssClientFromEnv,
  importTecnoempleoRss,
  TecnoempleoRssClient,
  TecnoempleoRssConfigError,
  TecnoempleoRssError,
} from "../src/portals/tecnoempleo-rss-client.mjs";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Alerta Project Manager</title>
    <lastBuildDate>Wed, 12 Aug 2026 08:00:00 GMT</lastBuildDate>
    <item>
      <guid isPermaLink="false">te-123</guid>
      <title>Project Manager</title>
      <link>https://www.tecnoempleo.com/ofertas-trabajo/project-manager/example</link>
      <author>Example Tech</author>
      <location>100% remoto</location>
      <pubDate>Wed, 12 Aug 2026 07:00:00 GMT</pubDate>
      <description><![CDATA[External job description]]></description>
      <category>Project Management</category>
      <category>Cloud</category>
    </item>
    <item>
      <guid>external-1</guid>
      <title>Invalid external item</title>
      <link>https://jobs.example.com/role/1</link>
    </item>
  </channel>
</rss>`;

test("reads and normalizes the user's official Tecnoempleo RSS alert", async () => {
  const calls = [];
  const client = new TecnoempleoRssClient({
    feedUrl: "https://www.tecnoempleo.com/rss/alerta.xml?token=fake-token",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return xmlResponse(RSS_FIXTURE);
    },
  });

  const result = await client.listJobs();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.hostname, "www.tecnoempleo.com");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(result.source, "tecnoempleo");
  assert.equal(result.feed.title, "Alerta Project Manager");
  assert.equal(result.diagnostics.receivedItems, 2);
  assert.equal(result.diagnostics.returnedItems, 1);
  assert.equal(result.diagnostics.skippedItems, 1);
  assert.deepEqual(result.jobs[0], {
    source: "tecnoempleo",
    externalId: "te-123",
    title: "Project Manager",
    company: "Example Tech",
    location: "100% remoto",
    url: "https://www.tecnoempleo.com/ofertas-trabajo/project-manager/example",
    publishedAt: "Wed, 12 Aug 2026 07:00:00 GMT",
    description: "External job description",
    categories: ["Project Management", "Cloud"],
    evidence: "user-authorized-rss-alert",
  });
});

test("imports user-provided RSS content without making a network request", () => {
  const result = importTecnoempleoRss(RSS_FIXTURE, { limit: 1 });

  assert.equal(result.source, "tecnoempleo");
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].externalId, "te-123");
  assert.equal(result.jobs[0].evidence, "user-authorized-rss-alert");
});

test("rejects empty and oversized RSS imports", () => {
  assert.throws(() => importTecnoempleoRss(""), /content is required/);
  assert.throws(() => importTecnoempleoRss("x".repeat(2_000_001)), /2 MB safety limit/);
});

test("rejects missing or non-Tecnoempleo feed URLs", () => {
  assert.throws(
    () => createTecnoempleoRssClientFromEnv({}),
    (error) => error instanceof TecnoempleoRssConfigError,
  );
  assert.throws(
    () =>
      new TecnoempleoRssClient({
        feedUrl: "https://feeds.example.com/jobs.xml",
      }),
    /must point to tecnoempleo\.com/,
  );
});

test("enforces the local item limit before requesting the feed", async () => {
  let called = false;
  const client = new TecnoempleoRssClient({
    feedUrl: "https://www.tecnoempleo.com/rss/alert.xml",
    fetchImpl: async () => {
      called = true;
      return xmlResponse(RSS_FIXTURE);
    },
  });

  await assert.rejects(() => client.listJobs({ limit: 51 }), /between 1 and 50/);
  assert.equal(called, false);
});

test("fails closed on unsupported XML", async () => {
  const client = new TecnoempleoRssClient({
    feedUrl: "https://www.tecnoempleo.com/rss/alert.xml",
    fetchImpl: async () => xmlResponse("<html><body>Not RSS</body></html>"),
  });

  await assert.rejects(
    () => client.listJobs(),
    (error) => error instanceof TecnoempleoRssError && /unsupported RSS/.test(error.message),
  );
});

test("returns a sanitized HTTP error without exposing the feed URL", async () => {
  const client = new TecnoempleoRssClient({
    feedUrl: "https://www.tecnoempleo.com/rss/alert.xml?secret=fake-secret",
    fetchImpl: async () => xmlResponse("Unauthorized fake-secret", 401),
  });

  await assert.rejects(
    () => client.listJobs(),
    (error) => {
      assert.ok(error instanceof TecnoempleoRssError);
      assert.equal(error.status, 401);
      assert.match(error.message, /HTTP 401/);
      assert.doesNotMatch(error.message, /secret|alert\.xml/i);
      return true;
    },
  );
});

function xmlResponse(xml, status = 200) {
  return new Response(xml, {
    status,
    headers: { "content-type": "application/rss+xml" },
  });
}
