import { MatchStatus } from "@/generated/prisma/client";
import { applyChampionatSnapshotToMatch } from "@/lib/football-api/championat/apply-championat-snapshot";
import {
  loadChampionatMatchEventsFromDb,
  persistChampionatMatchEventsIfChanged,
  persistMatchLiveStatusCacheIfChanged,
  removeLegacyTimelineMatchEvents,
} from "@/lib/football-api/championat/match-event-store";
import { hasImplausibleStoredScore } from "@/lib/football-api/championat/football-score";
import { fetchChampionatMatchLiveSnapshot } from "@/lib/football-api/championat/match-live-snapshot";
import type { ChampionatMatchLiveSnapshot } from "@/lib/football-api/championat/match-live-snapshot";
import { resolveChampionatSourceForTournament } from "@/lib/football-api/championat/resolve-source";
import { prisma } from "@/lib/db";

export type SyncChampionatMatchLiveResult = {
  ok: boolean;
  snapshot?: ChampionatMatchLiveSnapshot;
  events: Awaited<ReturnType<typeof loadChampionatMatchEventsFromDb>>;
  homeScore: number | null;
  awayScore: number | null;
  fromCache: boolean;
  dataChanged: boolean;
  error?: string;
};

type MatchSyncTarget = {
  id: string;
  tournamentId: string;
  externalId: string | null;
  startsAt: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string;
  awayTeamId: string;
  championatFinishedAt?: Date | null;
};

async function repairImplausibleScoreInDb(
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
): Promise<{ homeScore: number | null; awayScore: number | null }> {
  if (!hasImplausibleStoredScore(homeScore, awayScore)) {
    return { homeScore, awayScore };
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore: null, awayScore: null },
  });

  return { homeScore: null, awayScore: null };
}

export async function syncChampionatMatchLive(
  match: MatchSyncTarget,
): Promise<SyncChampionatMatchLiveResult> {
  const fallbackEvents = await loadChampionatMatchEventsFromDb(match.id);

  const source = await resolveChampionatSourceForTournament(match.tournamentId);
  if (!source || !match.externalId?.startsWith("championat:")) {
    const repaired = await repairImplausibleScoreInDb(
      match.id,
      match.homeScore,
      match.awayScore,
    );
    return {
      ok: false,
      events: fallbackEvents,
      homeScore: repaired.homeScore,
      awayScore: repaired.awayScore,
      fromCache: true,
      dataChanged: false,
      error: "no_championat_source",
    };
  }

  try {
    const snapshot = await fetchChampionatMatchLiveSnapshot(match.externalId, {
      tournamentId: source.championatTournamentId,
      sportSlug: source.sportSlug,
    });

    const legacyRemoved = await removeLegacyTimelineMatchEvents(match.id);
    const applyResult = await applyChampionatSnapshotToMatch(match, snapshot);
    const eventsChanged = await persistChampionatMatchEventsIfChanged(
      match.id,
      snapshot.events,
    );
    const liveCacheChanged = await persistMatchLiveStatusCacheIfChanged(
      match.id,
      snapshot.liveStatus,
    );

    await prisma.match.update({
      where: { id: match.id },
      data: { championatLastSyncAt: new Date() },
    });

    const refreshed = await prisma.match.findUnique({
      where: { id: match.id },
      select: { homeScore: true, awayScore: true },
    });

    const events = await loadChampionatMatchEventsFromDb(match.id);

    return {
      ok: true,
      snapshot,
      events,
      homeScore: refreshed?.homeScore ?? match.homeScore,
      awayScore: refreshed?.awayScore ?? match.awayScore,
      fromCache: false,
      dataChanged:
        applyResult.updated ||
        eventsChanged ||
        liveCacheChanged ||
        legacyRemoved > 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    const repaired = await repairImplausibleScoreInDb(
      match.id,
      match.homeScore,
      match.awayScore,
    );

    return {
      ok: false,
      events: fallbackEvents,
      homeScore: repaired.homeScore,
      awayScore: repaired.awayScore,
      fromCache: true,
      dataChanged: false,
      error: message,
    };
  }
}
