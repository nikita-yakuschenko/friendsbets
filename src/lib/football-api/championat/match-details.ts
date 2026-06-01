import { CHAMPIONAT_WORLD_CUP_2026 } from "@/lib/football-api/championat/constants";
import { normalizeVenueCityParts } from "@/lib/venue";

const FETCH_USER_AGENT =
  "FriendsBets/1.0 (+https://github.com/friendsbets; match sync)";

export type ChampionatMatchDetails = {
  venueName?: string;
  venueCity?: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function parseChampionatMatchPageHtml(
  html: string,
): ChampionatMatchDetails {
  const stadiumBlock = html.match(
    /Стадион:\s*<a[^>]*>([^<]+)<\/a>\s*\(\s*([^)]+)\s*\)/i,
  );

  if (!stadiumBlock) {
    return {};
  }

  const venueName = normalizeWhitespace(stadiumBlock[1] ?? "");
  const locationParts = normalizeWhitespace(stadiumBlock[2] ?? "")
    .split(",")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  const venueCity = normalizeVenueCityParts(locationParts);

  return {
    venueName: venueName || undefined,
    venueCity: venueCity || undefined,
  };
}

export function championatMatchPageUrl(
  matchId: number | string,
  tournamentId: number = CHAMPIONAT_WORLD_CUP_2026.tournamentId,
  sportSlug: string = CHAMPIONAT_WORLD_CUP_2026.sportSlug,
): string {
  return `https://www.championat.com/football/${sportSlug}/tournament/${tournamentId}/match/${matchId}/`;
}

export function extractChampionatMatchId(
  externalId: string | null | undefined,
): string | null {
  if (!externalId?.startsWith("championat:")) return null;
  const id = externalId.slice("championat:".length);
  return /^\d+$/.test(id) ? id : null;
}

export async function fetchChampionatMatchDetails(
  matchId: number | string,
  options?: {
    tournamentId?: number;
    sportSlug?: string;
  },
): Promise<ChampionatMatchDetails> {
  const url = championatMatchPageUrl(
    matchId,
    options?.tournamentId,
    options?.sportSlug,
  );

  const response = await fetch(url, {
    headers: {
      "User-Agent": FETCH_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Championat match request failed (${matchId}): ${response.status}`,
    );
  }

  return parseChampionatMatchPageHtml(await response.text());
}
