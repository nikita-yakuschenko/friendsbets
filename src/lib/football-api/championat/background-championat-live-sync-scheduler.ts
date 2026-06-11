import { MatchStatus } from "@/generated/prisma/client";
import { logOperation, logOperationError } from "@/lib/logger";
import { MATCH_LIVE_TRACKING_MAX_MS } from "@/lib/match-prediction-state";
import { prisma } from "@/lib/db";

/** Опрос идущих матчей — чаще общего sync. */
const LIVE_POLL_MS = 20_000;

const FETCH_GAP_MS = 150;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let started = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findLiveChampionatMatches(now: Date) {
  const windowStart = new Date(now.getTime() - MATCH_LIVE_TRACKING_MAX_MS);

  return prisma.match.findMany({
    where: {
      externalId: { startsWith: "championat:" },
      championatTrackActive: true,
      status: { notIn: [MatchStatus.CANCELLED] },
      OR: [
        { status: MatchStatus.LIVE },
        {
          status: { notIn: [MatchStatus.FINISHED] },
          startsAt: { lte: now, gte: windowStart },
        },
      ],
    },
    select: {
      id: true,
      tournamentId: true,
      externalId: true,
      startsAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      championatFinishedAt: true,
    },
    orderBy: { startsAt: "desc" },
    take: 20,
  });
}

async function runLiveSyncTick(): Promise<void> {
  if (running) return;
  running = true;
  const startedAt = Date.now();

  try {
    const { syncChampionatMatchLive } = await import(
      "@/lib/football-api/championat/sync-championat-match-live"
    );
    const matches = await findLiveChampionatMatches(new Date());

    let synced = 0;
    let events = 0;
    let errors = 0;

    for (const match of matches) {
      const result = await syncChampionatMatchLive(match);
      if (result.ok) {
        synced += 1;
        events += result.events.length;
      } else if (result.error && result.error !== "no_championat_source") {
        errors += 1;
      }
      await sleep(FETCH_GAP_MS);
    }

    if (matches.length > 0) {
      logOperation("championat-live-sync:background", {
        durationMs: Date.now() - startedAt,
        candidates: matches.length,
        synced,
        events,
        errors,
      });
    }
  } catch (error) {
    logOperationError("championat-live-sync:background", error);
  } finally {
    running = false;
  }
}

function scheduleNext(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void (async () => {
      await runLiveSyncTick();
      scheduleNext();
    })();
  }, LIVE_POLL_MS);
}

/** Фоновый опрос LIVE-матчей: счёт, фаза, события в БД. */
export function startBackgroundChampionatLiveSyncScheduler(): void {
  if (started) return;
  if (process.env.BACKGROUND_CHAMPIONAT_LIVE_SYNC === "false") return;

  started = true;
  logOperation("championat-live-sync:background:start", {});

  void (async () => {
    await runLiveSyncTick();
    scheduleNext();
  })();
}
