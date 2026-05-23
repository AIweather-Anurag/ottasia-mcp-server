/**
 * `search_titles` MCP tool — multi-result title search across OTTASIA's
 * catalog (powered by TMDB). Returns multiple candidates so Claude can
 * disambiguate before pulling provider data with `where_to_watch`.
 *
 * Wraps the public OTTASIA endpoint at /api/mcp/search.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const BASE_URL = process.env.OTTASIA_BASE_URL ?? "https://ottasia.com";

type ResultOut = {
  title: string;
  year: string;
  type: "movie" | "tv";
  id: number;
  popularity: number;
  overview: string;
  url: string;
};
type ApiResponse = {
  query: string;
  country: { code: string; name: string; flag: string };
  count: number;
  results: ResultOut[];
};

function formatResponse(data: ApiResponse): string {
  if (data.count === 0) {
    return `No movie or TV show found matching "${data.query}". Try a different spelling or original-language title.`;
  }

  const lines: string[] = [];
  lines.push(
    `Matches for "${data.query}" (links use ${data.country.flag} ${data.country.name} streaming context):`,
  );
  lines.push("");

  for (const r of data.results) {
    const typeLabel = r.type === "tv" ? "TV" : "Movie";
    const yr = r.year ? ` (${r.year})` : "";
    lines.push(`- ${r.title}${yr}, ${typeLabel}`);
    if (r.overview) lines.push(`  ${r.overview}`);
    lines.push(`  ${r.url}`);
  }
  return lines.join("\n");
}

export function registerSearchTitles(server: McpServer): void {
  server.registerTool(
    "search_titles",
    {
      title: "Search titles",
      description: [
        "Search OTTASIA's catalog for movies or TV shows by name. Returns multiple candidates with year, type, brief overview, and country-aware OTTASIA link.",
        "",
        "Use this when a user asks 'find me X' or when a query is ambiguous (e.g. 'joker', 'the office') and you need to clarify which title they meant before checking availability.",
        "Use where_to_watch instead when the user has already named a specific title and country and just wants the streaming providers.",
      ].join("\n"),
      inputSchema: {
        q: z
          .string()
          .min(2)
          .describe(
            "Search query (movie or TV show name). English, romanized, or original-language all work.",
          ),
        country: z
          .string()
          .length(2)
          .describe(
            "2-letter ISO country code for the resulting OTTASIA links (so clicking through opens that country's streaming context). One of: IN, PK, BD, ID, MY, PH, SG, TH, MM, KH, LA, BN, CN, HK, JP, KR, TW, KZ, UZ, TR, IL, LB, JO, SA, AE, KW, QA, BH, OM, EG. Defaults to IN.",
          )
          .optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .describe("Max number of results (1-20, default 8).")
          .optional(),
      },
    },
    async ({ q, country, limit }) => {
      const url = new URL(`${BASE_URL}/api/mcp/search`);
      url.searchParams.set("q", q);
      url.searchParams.set("country", (country ?? "IN").toUpperCase());
      if (limit) url.searchParams.set("limit", String(limit));

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: {
            "User-Agent": "ottasia-mcp/0.1.0 (+https://ottasia.com)",
            Accept: "application/json",
          },
        });
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `OTTASIA API unreachable: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `OTTASIA API returned ${response.status}: ${detail.slice(0, 200)}`,
            },
          ],
        };
      }

      let data: ApiResponse;
      try {
        data = (await response.json()) as ApiResponse;
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `OTTASIA API returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: formatResponse(data) }],
      };
    },
  );
}
