import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createZarJobsServer } from "./server.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const MAX_REQUEST_BYTES = 3_000_000;

export function createZarJobsHttpServer({ allowedHosts = [] } = {}) {
  const normalizedAllowedHosts = allowedHosts.map(normalizeHostname);

  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

    if (pathname === "/health" && request.method === "GET") {
      return sendJson(response, 200, {
        status: "ok",
        service: "zar-jobs-ai-connector",
        version: "0.5.0",
      });
    }

    if (pathname !== "/mcp") {
      return sendJson(response, 404, { error: "Not found." });
    }

    if (!isAllowedHost(request.headers.host, normalizedAllowedHosts)) {
      return sendJson(response, 421, { error: "Unrecognized host." });
    }

    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return sendJson(response, 405, {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      });
    }

    const declaredLength = Number(request.headers["content-length"] ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      return sendJson(response, 413, { error: "Request body is too large." });
    }

    let body;
    try {
      body = await readJsonBody(request);
    } catch (error) {
      const status = error?.code === "BODY_TOO_LARGE" ? 413 : 400;
      return sendJson(response, status, {
        error: status === 413 ? "Request body is too large." : "Invalid JSON body.",
      });
    }

    const server = createZarJobsServer({
      includeInfoJobsTools: false,
      includePrivateFeedTool: false,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, body);
    } catch {
      if (!response.headersSent) {
        sendJson(response, 500, {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error." },
          id: null,
        });
      }
    } finally {
      await transport.close();
      await server.close();
    }
  });
}

export async function startZarJobsHttpServer({
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  allowedHosts = [],
} = {}) {
  if (!isLoopback(host) && allowedHosts.length === 0) {
    throw new Error("ALLOWED_HOSTS is required when binding to a non-loopback host.");
  }

  const httpServer = createZarJobsHttpServer({ allowedHosts });
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, resolve);
  });
  return httpServer;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.HOST?.trim() || DEFAULT_HOST;
  const port = parsePort(process.env.PORT);
  const allowedHosts = parseAllowedHosts(process.env.ALLOWED_HOSTS);
  const httpServer = await startZarJobsHttpServer({ host, port, allowedHosts });
  const address = httpServer.address();
  const listeningPort = typeof address === "object" && address ? address.port : port;
  console.log(`Zar Jobs MCP listening on http://${host}:${listeningPort}/mcp`);

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => httpServer.close(() => process.exit(0)));
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let receivedBytes = 0;

  for await (const chunk of request) {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_REQUEST_BYTES) {
      const error = new Error("Request body is too large.");
      error.code = "BODY_TOO_LARGE";
      throw error;
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}

function parsePort(value) {
  if (value === undefined || value === "") return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}

function parseAllowedHosts(value) {
  if (!value?.trim()) return [];
  return value.split(",").map((host) => normalizeHostname(host.trim()));
}

function isAllowedHost(hostHeader, allowedHosts) {
  if (allowedHosts.length === 0) return true;
  if (typeof hostHeader !== "string" || !hostHeader.trim()) return false;

  try {
    return allowedHosts.includes(new URL(`http://${hostHeader}`).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function normalizeHostname(host) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized || normalized.includes("/") || normalized.includes("\\")) {
    throw new Error("ALLOWED_HOSTS must contain hostnames separated by commas.");
  }
  return normalized;
}

function isLoopback(host) {
  return ["127.0.0.1", "localhost", "::1"].includes(host.toLowerCase());
}
