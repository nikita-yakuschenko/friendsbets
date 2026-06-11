import { MatchStatus } from "@/generated/prisma/client";
import { applyChampionatSnapshotToMatch } from "@/lib/football-api/championat/apply-championat-snapshot";
import {
  loadChampionatMatchEventsFromDb,
  persistChampionatMatchEvents,
  persistMatchLiveStatusCache,
} from "@/lib/football-api/championat/match-event-store";
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

export async function syncChampionatMatchLive(
  match: MatchSyncTarget,
): Promise<SyncChampionatMatchLiveResult> {
  const fallbackEvents = await loadChampionatMatchEventsFromDb(match.id);
  const base = {
    events: fallbackEvents,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  };

  const source = await resolveChampionatSourceForTournament(match.tournamentId);
  if (!source || !match.externalId?.startsWith("championat:")) {
    return { ok: false, ...base, fromCache: true, error: "no_championat_source" };
  }

  try {
    const snapshot = await fetchChampionatMatchLiveSnapshot(match.externalId, {
      tournamentId: source.championatTournamentId,
      sportSlug: source.sportSlug,
    });

    await applyChampionatSnapshotToMatch(match, snapshot);

    if (snapshot.events.length > 0) {
      await persistChampionatMatchEvents(match.id, snapshot.events);
    }

    await persistMatchLiveStatusCache(match.id, snapshot.liveStatus);

    await prisma.match.update({
      where: { id: match.id },
      data: { championatLastSyncAt: new Date() },
    });

    const refreshed = await prisma.match.findUnique({
      where: { id: match.id },
      select: { homeScore: true, awayScore: true },
    });

    const events =
      snapshot.events.length > 0
        ? snapshot.events
        : await loadChampionatMatchEventsFromDb(match.id);

    return {
      ok: true,
      snapshot,
      events,
      homeScore: refreshed?.homeScore ?? match.homeScore,
      awayScore: refreshed?.awayScore ?? match.awayScore,
      fromCache: snapshot.events.length === 0 && events.length > 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    return {
      ok: false,
      ...base,
      fromCache: fallbackEvents.length > 0,
      error: message,
    };
  }
}
