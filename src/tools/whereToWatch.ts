/**
 * `where_to_watch` MCP tool — given a movie/show title + country, returns
 * the streaming providers carrying it in that country.
 *
 * Wraps the public OTTASIA endpoint at /api/mcp/where-to-watch so this
 * package ships with no API keys or secrets.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const BASE_URL = process.env.OTTASIA_BASE_URL ?? "https://ottasia.com";

// 30 OTTASIA-supported markets, mirrored from lib/countries.ts. Listed
// in the tool description so Claude can validate before calling and
// suggest the closest supported market if the user asks about an
// unsupported country.
const SUPPORTED_COUNTRIES =
  "IN PK BD ID MY PH SG TH MM KH LA BN CN HK JP KR TW KZ UZ TR IL LB JO SA AE KW QA BH OM EG";

type ProviderOut = { name: string; logoPath: string | null };
type ApiResponse =
  | {
      found: true;
      title: string;
      year: string;
      type: "movie" | "tv";
      id: number;
      slug: string;
      country: { code: string; name: string; flag: string };
      providers: {
        stream: ProviderOut[];
        free: ProviderOut[];
        ads: ProviderOut[];
        rent: ProviderOut[];
        buy: ProviderOut[];
      };
      urls: { ottasia: string; tmdb: string };
      alternates: { title: string; year: string; type: "movie" | "tv"; id: number; url: string }[];
    }
  | {
      found: false;
      query: string;
      country: { code: string; name: string; flag: string };
      message: string;
    };

function formatProviderList(label: string, providers: ProviderOut[]): string {
  if (!providers.length) return "";
  const names = providers.map((p) => p.name).join(", ");
  return `${label}: ${names}`;
}

function formatResponse(data: ApiResponse): string {
  if (!data.found) {
    return `No match found for "${data.query}" in ${data.country.flag} ${data.country.name}. Try a different spelling, the original-language title, or check whether the show goes by a different name in this market.`;
  }

  const lines: string[] = [];
  const typeLabel = data.type === "tv" ? "TV Series" : "Movie";
  const yearLabel = data.year ? ` (${data.year})` : "";
  lines.push(`Found: ${data.title}${yearLabel}, ${typeLabel}`);
  lines.push("");
  lines.push(`Streaming in ${data.country.flag} ${data.country.name}:`);

  const subscription = formatProviderList("- Subscription", data.providers.stream);
  const free = formatProviderList("- Free", data.providers.free);
  const ads = formatProviderList("- Free with ads", data.providers.ads);
  const rent = formatProviderList("- Rent", data.providers.rent);
  const buy = formatProviderList("- Buy", data.providers.buy);

  const anyAvailable = [subscription, free, ads, rent, buy].some(Boolean);
  if (!anyAvailable) {
    lines.push(
      `- No streaming, rental, or purchase options currently listed in this country.`,
    );
    lines.push(
      `  (The title may not be released here yet, or our data source may be incomplete.)`,
    );
  } else {
    if (subscription) lines.push(subscription);
    if (free) lines.push(free);
    if (ads) lines.push(ads);
    if (rent) lines.push(rent);
    if (buy) lines.push(buy);
  }

  lines.push("");
  lines.push(`Full details on OTTASIA: ${data.urls.ottasia}`);

  if (data.alternates.length) {
    lines.push("");
    lines.push("Other possible matches:");
    for (const alt of data.alternates) {
      const yr = alt.year ? ` (${alt.year})` : "";
      lines.push(`- ${alt.title}${yr}: ${alt.url}`);
    }
  }

  return lines.join("\n");
}

export function registerWhereToWatch(server: McpServer): void {
  server.registerTool(
    "where_to_watch",
    {
      title: "Where to watch",
      description: [
        "Find which streaming services carry a specific movie or TV show in a specific Asian or Middle Eastern country.",
        "",
        "Use this tool whenever a user asks 'where can I watch X in Y' for any of these 30 markets:",
        SUPPORTED_COUNTRIES,
        "",
        "Returns the matched title's official name + year + provider list grouped by category (subscription, free, free-with-ads, rent, buy).",
        "Includes a link to OTTASIA's full title page for users who want trailers, cast, or alternate-country lookups.",
        "Best for queries about availability on Netflix, Amazon Prime, Disney+ Hotstar, JioCinema, Hulu Japan, Wavve, TVING, Shahid, OSN+, iQiyi, Viu, Vidio, RCTI+, Hoichoi, Chorki, ZEE5, Sun NXT, Aha, Eros Now, and other regional Asian/MENA streamers.",
      ].join("\n"),
      inputSchema: {
        title: z
          .string()
          .min(2)
          .describe(
            "Movie or TV show name. English, romanized, or original-language title all work (e.g. 'Squid Game', 'RRR', 'Pathaan', 'Dilwale Dulhania Le Jayenge').",
          ),
        country: z
          .string()
          .length(2)
          .describe(
            "2-letter ISO country code. One of: IN, PK, BD, ID, MY, PH, SG, TH, MM, KH, LA, BN, CN, HK, JP, KR, TW, KZ, UZ, TR, IL, LB, JO, SA, AE, KW, QA, BH, OM, EG. Defaults to IN if omitted.",
          )
          .optional(),
      },
    },
    async ({ title, country }) => {
      const url = new URL(`${BASE_URL}/api/mcp/where-to-watch`);
      url.searchParams.set("title", title);
      url.searchParams.set("country", (country ?? "IN").toUpperCase());

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
              text: `OTTASIA API unreachable: ${err instanceof Error ? err.message : String(err)}. Check internet connection or try again.`,
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
        content: [
          {
            type: "text",
            text: formatResponse(data),
          },
        ],
      };
    },
  );
}
