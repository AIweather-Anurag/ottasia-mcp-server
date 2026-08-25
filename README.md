# @ottasia/mcp-server

[![npm version](https://img.shields.io/npm/v/@ottasia/mcp-server.svg)](https://www.npmjs.com/package/@ottasia/mcp-server)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-published-green)](https://registry.modelcontextprotocol.io/v0.1/servers?search=ottasia)
[![Glama](https://glama.ai/mcp/servers/badge?serverId=AIweather-Anurag/ottasia-mcp-server)](https://glama.ai/mcp/servers/AIweather-Anurag/ottasia-mcp-server)

> Where can I watch X in Y? Answer that question, in your AI assistant, for 30 Asian and Middle Eastern streaming markets.

OTTASIA's Model Context Protocol server gives Claude (and any MCP-compatible client) live access to streaming availability across India, Pakistan, Bangladesh, Indonesia, Malaysia, Philippines, Singapore, Thailand, Myanmar, Cambodia, Laos, Brunei, China, Hong Kong, Japan, Korea, Taiwan, Kazakhstan, Uzbekistan, Turkey, Israel, Lebanon, Jordan, Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman, and Egypt.

It wraps [ottasia.com](https://ottasia.com), so the same data that powers our website is one prompt away.

---

## Install (Claude Desktop)

Add this to your Claude Desktop config file:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ottasia": {
      "command": "npx",
      "args": ["-y", "@ottasia/mcp-server"]
    }
  }
}
```

Restart Claude Desktop. The OTTASIA tools should appear in the tool list.

No API keys. No env vars. Nothing to configure.

---

## Tools

### `where_to_watch`

> Find which streaming services carry a specific movie or TV show in a specific country.

**Inputs:**
- `title` (string, required): movie or TV show name
- `country` (2-letter ISO code, optional, default `IN`)

**Example prompts:**
- "Where can I watch Squid Game in Indonesia?"
- "Is Pathaan available on any service in Saudi Arabia?"
- "Use the ottasia where_to_watch tool to find Game of Thrones in Japan."

### `whats_new_on`

> List the latest titles added to a specific streaming service in a country.

**Inputs:**
- `provider` (slug, required): e.g. `netflix`, `prime-video`, `disney-plus-hotstar`, `wavve`, `shahid`, `viu`
- `country` (2-letter ISO code, optional, default `IN`)
- `limit` (number, optional, default 15, max 30)

**Example prompts:**
- "What's new on Netflix in India this month?"
- "Any new K-dramas added to Wavve in Korea?"
- "List recent arrivals on Shahid in Saudi Arabia."

### `search_titles`

> Multi-result search for movies and TV shows. Returns multiple candidates so you can disambiguate before checking availability.

**Inputs:**
- `q` (string, required): search query
- `country` (2-letter ISO code, optional, default `IN`)
- `limit` (number, optional, default 8, max 20)

**Example prompts:**
- "Search OTTASIA for 'the office'"
- "Find all matches for 'joker' and tell me which one is the 2019 Joaquin Phoenix film."

---

## Supported countries

`IN` India · `PK` Pakistan · `BD` Bangladesh · `ID` Indonesia · `MY` Malaysia · `PH` Philippines · `SG` Singapore · `TH` Thailand · `MM` Myanmar · `KH` Cambodia · `LA` Laos · `BN` Brunei · `CN` China · `HK` Hong Kong · `JP` Japan · `KR` South Korea · `TW` Taiwan · `KZ` Kazakhstan · `UZ` Uzbekistan · `TR` Turkey · `IL` Israel · `LB` Lebanon · `JO` Jordan · `SA` Saudi Arabia · `AE` UAE · `KW` Kuwait · `QA` Qatar · `BH` Bahrain · `OM` Oman · `EG` Egypt

## Common providers

`netflix` · `prime-video` · `disney-plus-hotstar` · `jiohotstar` · `hulu-japan` · `wavve` · `tving` · `viu` · `vidio` · `iqiyi` · `shahid` · `osn-plus` · `starzplay` · `hoichoi` · `chorki` · `zee5` · `sun-nxt` · `aha` · `eros-now` · `manorama-max` · `shemaroo-me` · `crunchyroll` · `apple-tv-plus` · `hbo-max`

Pass any of these as the `provider` argument to `whats_new_on`. The API will suggest near-matches if the slug is wrong.

---

## How it works

The MCP server is a thin client that calls public JSON endpoints on [ottasia.com](https://ottasia.com):

- `/api/mcp/where-to-watch?title=...&country=...`
- `/api/mcp/whats-new?provider=...&country=...&limit=...`
- `/api/mcp/search?q=...&country=...&limit=...`

All TMDB data, caching, and per-country provider logic stays on the OTTASIA backend, so your installed npm package never holds an API key.

### Alternate transport: HTTP/SSE

If you're integrating from a non-Claude-Desktop client (Claude API, browser-based MCP playground, custom code), you can connect directly to the hosted HTTP endpoint:

```
https://ottasia.com/api/mcp/sse
```

Uses the MCP Streamable HTTP transport (stateless, JSON responses). Same 3 tools, same data.

### Local development override

To run against a local OTTASIA dev server, set `OTTASIA_BASE_URL=http://localhost:3000` in your MCP config:

```json
{
  "mcpServers": {
    "ottasia-local": {
      "command": "node",
      "args": ["/absolute/path/to/this/repo/dist/server.js"],
      "env": { "OTTASIA_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

---

## Listings

- npm: [@ottasia/mcp-server](https://www.npmjs.com/package/@ottasia/mcp-server)
- Official MCP Registry: [io.github.AIweather-Anurag/ottasia](https://registry.modelcontextprotocol.io/v0.1/servers?search=ottasia)
- [mcp.so](https://mcp.so/server/ottasia/AIweather-Anurag)
- [Smithery](https://smithery.ai/server/@ottasia/mcp-server)
- [Glama](https://glama.ai/mcp/servers/AIweather-Anurag/ottasia-mcp-server)
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) (PR #6808 pending)
- [Cline marketplace](https://github.com/cline/cline/discussions/1650) (submitted)

## Links

- Website: [ottasia.com](https://ottasia.com)
- Issues: open an issue on this repo or DM [@AnuragTyagi on X](https://x.com/AnuragTyagi)
- MCP spec: [modelcontextprotocol.io](https://modelcontextprotocol.io)

## Privacy Policy

This server is a read-only lookup tool. It sends only the query your AI
assistant makes (a title name, a streaming service, a two-letter country
code) to OTTASIA's public API at ottasia.com and returns streaming
availability data with links back to ottasia.com. It does not collect,
store, or transmit personal data, credentials, files, or conversation
content, and it requires no account or API key.

Full privacy policy: https://ottasia.com/privacy

## License

MIT
