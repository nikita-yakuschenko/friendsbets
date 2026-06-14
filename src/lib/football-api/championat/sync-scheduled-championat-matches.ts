import { MatchStatus } from "@/generated/prisma/client";
import { syncChampionatMatchLive } from "@/lib/football-api/championat/sync-championat-match-live";
import { shouldDeactivateChampionatTracking } from "@/lib/football-api/championat/championat-tracking";
import { shouldPollChampionatMatchNow } from "@/lib/football-api/championat/match-sync-schedule";
import { prisma } from "@/lib/db";

const FETCH_GAP_MS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ScheduledChampionatSyncResult = {
  candidates: number;
  polled: number;
  updated: number;
  finished: number;
  errors: number;
};

export type ScheduledChampionatSyncOptions = {
  /** Только матчи этого турнира (страница прогнозов, игра). */
  tournamentId?: string;
  /** Верхняя граница HTTP-запросов к Championat за один вызов. */
  maxPolls?: number;
};

async function deactivateExpiredChampionatTracking(now: Date): Promise<number> {
  const expired = await prisma.match.findMany({
    where: {
      externalId: { startsWith: "championat:" },
      championatTrackActive: true,
      status: MatchStatus.FINISHED,
      championatFinishedAt: { not: null },
    },
    select: { id: true, championatFinishedAt: true },
  });

  const ids = expired
    .filter((m) =>
      shouldDeactivateChampionatTracking(
        MatchStatus.FINISHED,
        m.championatFinishedAt,
        now,
      ),
    )
    .map((m) => m.id);

  if (ids.length === 0) return 0;

  await prisma.match.updateMany({
    where: { id: { in: ids } },
    data: { championatTrackActive: false },
  });

  return ids.length;
}

/**
 * Опрос страниц матчей по расписанию (слоты МСК, зависшие матчи).
 * LIVE и 10 мин после FINISHED — только live-воркер (60 с).
 */
export async function runScheduledChampionatMatchSyncs(
  options: ScheduledChampionatSyncOptions = {},
): Promise<ScheduledChampionatSyncResult> {
  const now = new Date();
  await deactivateExpiredChampionatTracking(now);

  const matches = await prisma.match.findMany({
    where: {
      externalId: { startsWith: "championat:" },
      championatTrackActive: true,
      status: { notIn: [MatchStatus.CANCELLED] },
      ...(options.tournamentId ? { tournamentId: options.tournamentId } : {}),
    },
    select: {
      id: true,
      externalId: true,
      tournamentId: true,
      startsAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      winnerTeamId: true,
      championatLastSyncAt: true,
      championatFinishedAt: true,
      championatTrackActive: true,
    },
  });

  let polled = 0;
  let updated = 0;
  let finished = 0;
  let errors = 0;

  for (const match of matches) {
    if (
      !shouldPollChampionatMatchNow({
        startsAt: match.startsAt,
        status: match.status,
        championatTrackActive: match.championatTrackActive,
        championatLastSyncAt: match.championatLastSyncAt,
        championatFinishedAt: match.championatFinishedAt,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        now,
      })
    ) {
      continue;
    }

    if (!match.externalId) continue;

    if (options.maxPolls !== undefined && polled >= options.maxPolls) {
      break;
    }

    polled += 1;

    try {
      const result = await syncChampionatMatchLive(match);

      if (result.ok && result.snapshot) {
        updated += 1;
        if (
          result.snapshot.status === MatchStatus.FINISHED ||
          result.snapshot.livePhase === "finished"
        ) {
          finished += 1;
        }
      } else if (result.error && result.error !== "no_championat_source") {
        throw new Error(result.error);
      }
    } catch (error) {
      errors += 1;
      console.warn(
        `[championat-scheduled] match=${match.id}`,
        error instanceof Error ? error.message : error,
      );
    }

    await sleep(FETCH_GAP_MS);
  }

  return {
    candidates: matches.length,
    polled,
    updated,
    finished,
    errors,
  };
}
