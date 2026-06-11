import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { logOperation, logOperationError } from "@/lib/logger";
import { MATCH_LIVE_TRACKING_MAX_MS } from "@/lib/match-prediction-state";

/** Интервал, когда есть лайв / зависшие / ближайшие матчи. */
const FAST_POLL_MS = 45_000;

/** Интервал вне активного окна турнира. */
const SLOW_POLL_MS = 3 * 60_000;

const QUICK_SYNC_NEAR_HOURS = 72;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let started = false;

async function hasActiveChampionatMatches(now: Date): Promise<boolean> {
  const staleCutoff = new Date(now.getTime() - MATCH_LIVE_TRACKING_MAX_MS);
  const nearAhead = new Date(
    now.getTime() + QUICK_SYNC_NEAR_HOURS * 60 * 60 * 1000,
  );
  const nearBehind = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const count = await prisma.match.count({
    where: {
      externalId: { startsWith: "championat:" },
      championatTrackActive: true,
      status: { notIn: [MatchStatus.FINISHED, MatchStatus.CANCELLED] },
      OR: [
        { status: MatchStatus.LIVE },
        { startsAt: { lte: staleCutoff } },
        {
          status: MatchStatus.SCHEDULED,
          startsAt: { gte: nearBehind, lte: nearAhead },
        },
      ],
    },
  });

  return count > 0;
}

async function computeNextDelayMs(): Promise<number> {
  try {
    const active = await hasActiveChampionatMatches(new Date());
    return active ? FAST_POLL_MS : SLOW_POLL_MS;
  } catch {
    return SLOW_POLL_MS;
  }
}

async function runChampionatSyncTick(): Promise<void> {
  if (running) return;
  running = true;
  const startedAt = Date.now();

  try {
    const { runScheduledChampionatMatchSyncs } = await import(
      "@/lib/football-api/championat/sync-scheduled-championat-matches"
    );
    const { syncMatches } = await import("@/lib/football-api/sync");

    const scheduled = await runScheduledChampionatMatchSyncs({ maxPolls: 40 });
    const quick = await syncMatches(undefined, { mode: "quick" });

    logOperation("championat-sync:background", {
      durationMs: Date.now() - startedAt,
      scheduledPolled: scheduled.polled,
      scheduledUpdated: scheduled.updated,
      scheduledFinished: scheduled.finished,
      scheduledErrors: scheduled.errors,
      quickUpdated: quick.updated,
      quickStatusesUpdated: quick.statusesUpdated ?? 0,
      quickExternalRequests: quick.externalRequests ?? 0,
    });
  } catch (error) {
    logOperationError("championat-sync:background", error);
  } finally {
    running = false;
  }
}

async function scheduleNext(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const delay = await computeNextDelayMs();
  timer = setTimeout(() => {
    void (async () => {
      await runChampionatSyncTick();
      await scheduleNext();
    })();
  }, delay);
}

/** Фоновый синк Championat (дополняет HTTP cron). */
export function startBackgroundChampionatSyncScheduler(): void {
  if (started) return;
  if (process.env.BACKGROUND_CHAMPIONAT_SYNC === "false") return;

  started = true;
  logOperation("championat-sync:background:start", {});

  void (async () => {
    await runChampionatSyncTick();
    await scheduleNext();
  })();
}
