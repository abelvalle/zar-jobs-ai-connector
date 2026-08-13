#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createZarJobsServer } from "./server.mjs";

const server = createZarJobsServer();
const transport = new StdioServerTransport();
await server.connect(transport);
