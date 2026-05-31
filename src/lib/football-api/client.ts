import {
  CHAMPIONAT_WORLD_CUP_2026,
  championatCalendarUrl,
  championatTournamentExternalId,
} from "@/lib/football-api/championat/constants";
import { fetchChampionatCalendar } from "@/lib/football-api/championat/parser";
import type { ExternalMatch } from "@/lib/football-api/types";

export type ChampionatSyncConfig = {
  championatTournamentId: number;
  sportSlug: string;
  calendarUrl: string;
  tournamentExternalId: string;
  dbTournamentId?: string;
};

export function getChampionatSyncConfig(): ChampionatSyncConfig {
  const championatTournamentId = Number(
    process.env.CHAMPIONAT_TOURNAMENT_ID ??
      CHAMPIONAT_WORLD_CUP_2026.tournamentId,
  );
  const sportSlug =
    process.env.CHAMPIONAT_SPORT_SLUG ?? CHAMPIONAT_WORLD_CUP_2026.sportSlug;

  return {
    championatTournamentId,
    sportSlug,
    calendarUrl: championatCalendarUrl(championatTournamentId, sportSlug),
    tournamentExternalId: championatTournamentExternalId(championatTournamentId),
    dbTournamentId: process.env.CHAMPIONAT_SYNC_TOURNAMENT_ID,
  };
}

export async function fetchTournamentMatches(
  tournamentExternalId?: string,
): Promise<ExternalMatch[]> {
  const config = getChampionatSyncConfig();
  if (
    tournamentExternalId &&
    tournamentExternalId !== config.tournamentExternalId
  ) {
    throw new Error(
      `Unsupported tournament external id: ${tournamentExternalId}`,
    );
  }

  return fetchChampionatCalendar(config.calendarUrl);
}

export { fetchChampionatCalendar, parseChampionatCalendarHtml } from "@/lib/football-api/championat/parser";
