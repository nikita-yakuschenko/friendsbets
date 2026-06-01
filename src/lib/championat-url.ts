import {
  championatCalendarUrl,
  championatTournamentExternalId,
} from "@/lib/football-api/championat/constants";

export type ParsedChampionatTournamentUrl = {
  championatTournamentId: number;
  sportSlug: string;
  calendarUrl: string;
  tournamentExternalId: string;
};

/** Путь или полный URL: /football/{slug}/tournament/{id}/… */
const CHAMPIONAT_TOURNAMENT_PATH =
  /\/football\/([^/]+)\/tournament\/(\d+)/i;

function matchChampionatTournamentPath(input: string) {
  const raw = input.trim();
  if (!raw) return null;

  const direct = raw.match(CHAMPIONAT_TOURNAMENT_PATH);
  if (direct) return direct;

  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    return url.pathname.match(CHAMPIONAT_TOURNAMENT_PATH);
  } catch {
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return path.match(CHAMPIONAT_TOURNAMENT_PATH);
  }
}

export function parseChampionatTournamentUrl(
  input: string,
): ParsedChampionatTournamentUrl | null {
  const match = matchChampionatTournamentPath(input);
  if (!match) return null;

  const sportSlug = match[1];
  const championatTournamentId = Number(match[2]);
  if (!sportSlug || !Number.isFinite(championatTournamentId)) return null;

  return {
    championatTournamentId,
    sportSlug,
    calendarUrl: championatCalendarUrl(championatTournamentId, sportSlug),
    tournamentExternalId: championatTournamentExternalId(championatTournamentId),
  };
}

export function isValidChampionatTournamentUrl(input: string): boolean {
  return parseChampionatTournamentUrl(input) !== null;
}
