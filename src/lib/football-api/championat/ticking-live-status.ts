import type { ChampionatLiveStatus } from "@/lib/football-api/championat/match-live-status";

const TICKABLE_PHASES = new Set<ChampionatLiveStatus["phase"]>([
  "live",
  "extra_time",
]);

function minuteCapForPeriod(
  period: ChampionatLiveStatus["period"],
): number | null {
  if (period === "first_half") return 45;
  if (period === "second_half") return 90;
  if (period === "extra_time") return 120;
  return null;
}

/**
 * Между синками с Championat увеличивает минуту на табло (~1 мин реального времени).
 * Якорь — момент последнего синка (championatLastSyncAt).
 */
export function applyLiveMinuteTick(
  status: ChampionatLiveStatus,
  anchoredAtMs: number | null,
  nowMs: number = Date.now(),
): ChampionatLiveStatus {
  if (!anchoredAtMs) return status;
  if (!TICKABLE_PHASES.has(status.phase)) return status;
  if (status.minute == null) return status;

  const elapsedMinutes = Math.floor((nowMs - anchoredAtMs) / 60_000);
  if (elapsedMinutes <= 0) return status;

  let nextMinute = status.minute + elapsedMinutes;
  const cap = minuteCapForPeriod(status.period);
  if (cap != null) {
    nextMinute = Math.min(nextMinute, cap);
  }

  if (nextMinute === status.minute) return status;

  return { ...status, minute: nextMinute };
}
