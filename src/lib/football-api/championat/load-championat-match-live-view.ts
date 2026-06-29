import { MatchStatus } from "@/generated/prisma/client";
import { CHAMPIONAT_LIVE_DATA_STALE_MS } from "@/lib/football-api/championat/championat-live-constants";
import { sanitizeStoredScore } from "@/lib/football-api/championat/football-score";
import { loadChampionatMatchEventsFromDb } from "@/lib/football-api/championat/match-event-store";
import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-status";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";
import {
  isChampionatPostFinishPollPhase,
} from "@/lib/football-api/championat/championat-tracking";
import { isMatchInProgress } from "@/lib/match-prediction-state";

export type ChampionatMatchLiveView = {
  events: ChampionatMatchEvent[];
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  livePhase: ChampionatLivePhase;
  liveStatus: {
    phase: ChampionatLivePhase;
    minute?: number;
    rawText: string;
  };
  championatLastSyncAt: Date | null;
  eventsSyncedAt: Date | null;
};

type MatchLiveViewSource = {
  status: MatchStatus | string;
  startsAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  liveMinute: number | null;
  livePhaseCache: string | null;
  liveStatusRaw: string | null;
  championatLastSyncAt: Date | null;
  eventsSyncedAt: Date | null;
  championatFinishedAt?: Date | null;
};

function defaultLivePhase(
  status: MatchStatus | string,
): ChampionatLivePhase {
  if (status === MatchStatus.FINISHED) return "finished";
  if (status === MatchStatus.LIVE) return "live";
  return "scheduled";
}

export function isChampionatLiveViewStale(
  match: {
    status: MatchStatus | string;
    startsAt: Date;
    championatFinishedAt?: Date | null;
  },
  championatLastSyncAt: Date | null,
  now: Date = new Date(),
): boolean {
  const tracking =
    isMatchInProgress(
      {
        status: match.status,
        startsAt: match.startsAt,
        homeScore: null,
        awayScore: null,
      },
      now,
    ) ||
    isChampionatPostFinishPollPhase(
      match.status,
      match.championatFinishedAt,
      now,
    );

  if (!tracking) return false;
  if (!championatLastSyncAt) return true;
  return now.getTime() - championatLastSyncAt.getTime() > CHAMPIONAT_LIVE_DATA_STALE_MS;
}

export async function loadChampionatMatchLiveView(
  matchId: string,
  match: MatchLiveViewSource,
): Promise<ChampionatMatchLiveView> {
  const events = await loadChampionatMatchEventsFromDb(matchId);
  const storedScores = sanitizeStoredScore(match.homeScore, match.awayScore);
  const cachedPhase = match.livePhaseCache as ChampionatLivePhase | null;
  const livePhase = cachedPhase ?? defaultLivePhase(match.status);

  return {
    events,
    homeScore: storedScores.homeScore,
    awayScore: storedScores.awayScore,
    homePenaltyScore: match.homePenaltyScore ?? null,
    awayPenaltyScore: match.awayPenaltyScore ?? null,
    livePhase,
    liveStatus: {
      phase: livePhase,
      minute: match.liveMinute ?? undefined,
      rawText: match.liveStatusRaw ?? "",
    },
    championatLastSyncAt: match.championatLastSyncAt,
    eventsSyncedAt: match.eventsSyncedAt,
  };
}
