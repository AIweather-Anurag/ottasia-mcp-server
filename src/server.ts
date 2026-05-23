#!/usr/bin/env node
/**
 * OTTASIA MCP server entrypoint.
 *
 * Connects via stdio so the install snippet in Claude Desktop is a one-liner:
 *
 *     "ottasia": {
 *       "command": "npx",
 *       "args": ["-y", "@ottasia/mcp-server"]
 *     }
 *
 * All tools delegate to a thin OTTASIA HTTPS API (https://ottasia.com/api/mcp/*),
 * so no TMDB credentials live inside this package. Users install, restart
 * Claude Desktop, and the tools work — no env-var setup required.
 *
 * Set `OTTASIA_BASE_URL` to point at a local OTTASIA dev server while
 * iterating; defaults to production.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerWhereToWatch } from "./tools/whereToWatch.js";
import { registerWhatsNewOn } from "./tools/whatsNewOn.js";
import { registerSearchTitles } from "./tools/searchTitles.js";

const server = new McpServer({
  name: "ottasia",
  version: "0.1.0",
});

registerWhereToWatch(server);
registerWhatsNewOn(server);
registerSearchTitles(server);

const transport = new StdioServerTransport();
await server.connect(transport);

// MCP clients communicate over stdio, so anything we'd normally write to
// stdout would corrupt the JSON-RPC stream. Diagnostic messages must go
// to stderr — Claude Desktop captures these in its MCP logs.
console.error("OTTASIA MCP server v0.1.0 running on stdio");
