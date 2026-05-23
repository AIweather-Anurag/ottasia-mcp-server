/**
 * `whats_new_on` MCP tool — lists titles recently added to a specific
 * streaming service in a specific country.
 *
 * Wraps the public OTTASIA endpoint at /api/mcp/whats-new.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const BASE_URL = process.env.OTTASIA_BASE_URL ?? "https://ottasia.com";

// Curated short-list of the highest-traffic provider slugs so Claude has
// a fast reference for what to pass. The full list lives in
// lib/categories.ts and the API endpoint will accept any valid slug or
// suggest near-matches if the slug is wrong.
const COMMON_PROVIDERS =
  "netflix, prime-video, disney-plus-hotstar, jiohotstar, hulu-japan, wavve, tving, viu, vidio, iqiyi, shahid, osn-plus, starzplay, hoichoi, chorki, zee5, sun-nxt, aha, eros-now, manorama-max, shemaroo-me, crunchyroll, apple-tv-plus, hbo-max";

type TitleOut = {
  title: string;
  year: string;
  type: "movie" | "tv";
  id: number;
  overview: string;
  url: string;
};
type ApiResponse =
  | {
      found: true;
      partial: boolean;
      provider: { slug: string; name: string };
      country: { code: string; name: string; flag: string };
      titles: TitleOut[];
      browseUrl: string;
      message?: string;
    }
  | {
      found: false;
      provider?: { slug: string; name: string };
      country?: { code: string; name: string; flag: string };
      browseUrl?: string;
      message?: string;
      error?: string;
      suggestion?: string[];
      hint?: string;
    };

function formatResponse(data: ApiResponse): string {
  if (!data.found) {
    const lines: string[] = [];
    if (data.message) lines.push(data.message);
    if (data.error) lines.push(data.error);
    if (data.suggestion?.length) {
      lines.push(`Did you mean: ${data.suggestion.join(", ")}?`);
    }
    if (data.hint) lines.push(data.hint);
    if (data.browseUrl) lines.push(`Browse: ${data.browseUrl}`);
    return lines.join("\n");
  }

  const lines: string[] = [];
  lines.push(
    `New on ${data.provider.name} in ${data.country.flag} ${data.country.name} (last ~90 days):`,
  );
  lines.push("");

  if (data.titles.length === 0) {
    if (data.message) lines.push(data.message);
    else lines.push("No recent additions found in this window.");
    if (data.browseUrl) lines.push(`Browse: ${data.browseUrl}`);
    return lines.join("\n");
  }

  for (const t of data.titles) {
    const typeLabel = t.type === "tv" ? "TV" : "Movie";
    const yr = t.year ? ` (${t.year})` : "";
    lines.push(`- ${t.title}${yr}, ${typeLabel}`);
    if (t.overview) lines.push(`  ${t.overview}`);
    lines.push(`  ${t.url}`);
  }
  lines.push("");
  lines.push(`Full list with posters + filters: ${data.browseUrl}`);
  if (data.partial) {
    lines.push(
      "(Note: this provider's catalog isn't fully TMDB-tagged, so the list above may be incomplete.)",
    );
  }
  return lines.join("\n");
}

export function registerWhatsNewOn(server: McpServer): void {
  server.registerTool(
    "whats_new_on",
    {
      title: "What's new on a streaming service",
      description: [
        "List the latest movies and TV shows recently added to a specific streaming service in a specific country.",
        "",
        "Use this tool when a user asks 'what's new on Netflix in India', 'any new shows on Wavve', 'what came out on Disney+ Hotstar this month', etc.",
        "",
        "Common provider slugs to use as the `provider` argument:",
        COMMON_PROVIDERS,
        "",
        "Country must be a 2-letter ISO code from OTTASIA's 30 supported markets (IN PK BD ID MY PH SG TH MM KH LA BN CN HK JP KR TW KZ UZ TR IL LB JO SA AE KW QA BH OM EG).",
        "Returns a list of recent arrivals with brief overviews + links. Pair with where_to_watch if the user wants details on a specific title.",
      ].join("\n"),
      inputSchema: {
        provider: z
          .string()
          .min(2)
          .describe(
            "Streaming service slug. Examples: netflix, prime-video, disney-plus-hotstar, jiohotstar, wavve, tving, viu, shahid, hoichoi, zee5, sun-nxt. Use lowercase + hyphens.",
          ),
        country: z
          .string()
          .length(2)
          .describe(
            "2-letter ISO country code. One of: IN, PK, BD, ID, MY, PH, SG, TH, MM, KH, LA, BN, CN, HK, JP, KR, TW, KZ, UZ, TR, IL, LB, JO, SA, AE, KW, QA, BH, OM, EG. Defaults to IN if omitted.",
          )
          .optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(30)
          .describe(
            "Max number of titles to return (1-30, default 15). Lower limit = quicker response.",
          )
          .optional(),
      },
    },
    async ({ provider, country, limit }) => {
      const url = new URL(`${BASE_URL}/api/mcp/whats-new`);
      url.searchParams.set("provider", provider);
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

      // 404 with structured body is expected for "unknown provider" / "not in
      // this country" — surface it as readable text, not an error.
      let data: ApiResponse;
      try {
        data = (await response.json()) as ApiResponse;
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `OTTASIA API returned invalid JSON (${response.status}): ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }

      if (!response.ok && response.status !== 404) {
        return {
          isError: true,
          content: [
            { type: "text", text: `OTTASIA API ${response.status}: ${formatResponse(data)}` },
          ],
        };
      }

      return {
        content: [{ type: "text", text: formatResponse(data) }],
      };
    },
  );
}
