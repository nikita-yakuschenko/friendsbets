import { MatchStatus } from "@/generated/prisma/client";
import { CHAMPIONAT_WORLD_CUP_2026 } from "@/lib/football-api/championat/constants";
import { parseChampionatMatchStatusFromHtml } from "@/lib/football-api/championat/match-status";
import { normalizeVenueCityParts } from "@/lib/venue";

import { fetchChampionatHtml } from "@/lib/football-api/championat/fetch-html";

export type ChampionatMatchDetails = {
  venueName?: string;
  venueCity?: string;
  status?: MatchStatus;
  homeScore?: number;
  awayScore?: number;
};

function parseLiveScoreFromMatchPage(html: string): {
  homeScore?: number;
  awayScore?: number;
  impliesLive: boolean;
} {
  const halfBlock = html.match(
    /(?:1-?й|2-?й)\s+тайм[\s\S]{0,160}?(\d+)\s*:\s*(\d+)/i,
  );
  if (halfBlock) {
    return {
      homeScore: Number(halfBlock[1]),
      awayScore: Number(halfBlock[2]),
      impliesLive: true,
    };
  }

  const titleBlock = html.match(/<title>[^<]*/i)?.[0] ?? "";
  if (
    /(?:трансляц|онлайн)/i.test(titleBlock) &&
    /сч[её]т\s+(\d+)\s*:\s*(\d+)/i.test(titleBlock)
  ) {
    const titleScore = titleBlock.match(/сч[её]т\s+(\d+)\s*:\s*(\d+)/i);
    if (titleScore) {
      return {
        homeScore: Number(titleScore[1]),
        awayScore: Number(titleScore[2]),
        impliesLive: true,
      };
    }
  }

  return { impliesLive: false };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function parseChampionatMatchPageHtml(
  html: string,
): ChampionatMatchDetails {
  const stadiumBlock = html.match(
    /Стадион:\s*<a[^>]*>([^<]+)<\/a>\s*\(\s*([^)]+)\s*\)/i,
  );

  const liveScore = parseLiveScoreFromMatchPage(html);
  let status = parseChampionatMatchStatusFromHtml(html);
  if (!status && liveScore.impliesLive) {
    status = MatchStatus.LIVE;
  }

  const scoreFields =
    liveScore.homeScore !== undefined && liveScore.awayScore !== undefined
      ? { homeScore: liveScore.homeScore, awayScore: liveScore.awayScore }
      : {};

  if (!stadiumBlock) {
    return { ...scoreFields, ...(status ? { status } : {}) };
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
    status,
    ...scoreFields,
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

  const html = await fetchChampionatHtml(url);
  return parseChampionatMatchPageHtml(html);
}
