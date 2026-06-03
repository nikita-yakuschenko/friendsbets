import { MatchStatus } from "@/generated/prisma/client";

/** После FINISHED ещё 10 минут опрашиваем страницу каждые 30 с. */
export const CHAMPIONAT_POST_FINISH_TRACKING_MS = 10 * 60_000;

export function isChampionatPostFinishPollPhase(
  status: MatchStatus | string,
  championatFinishedAt: Date | null | undefined,
  now: Date,
): boolean {
  if (status !== MatchStatus.FINISHED) return false;
  const anchorMs = (championatFinishedAt ?? now).getTime();
  return now.getTime() - anchorMs < CHAMPIONAT_POST_FINISH_TRACKING_MS;
}

/** Пора отписаться от опроса Championat. */
export function shouldDeactivateChampionatTracking(
  status: MatchStatus | string,
  championatFinishedAt: Date | null | undefined,
  now: Date,
): boolean {
  if (status === MatchStatus.CANCELLED) return true;
  if (status !== MatchStatus.FINISHED) return false;
  if (!championatFinishedAt) return false;
  return (
    now.getTime() - championatFinishedAt.getTime() >=
    CHAMPIONAT_POST_FINISH_TRACKING_MS
  );
}

export function championatFinishedTrackingPatch(
  currentStatus: MatchStatus | string,
  nextStatus: MatchStatus | string,
  championatFinishedAt: Date | null | undefined,
  now: Date,
): { championatFinishedAt?: Date; championatTrackActive?: boolean } {
  if (nextStatus !== MatchStatus.FINISHED) {
    return {};
  }

  const finishedAt = championatFinishedAt ?? now;

  if (shouldDeactivateChampionatTracking(nextStatus, finishedAt, now)) {
    return { championatFinishedAt: finishedAt, championatTrackActive: false };
  }

  return { championatFinishedAt: finishedAt, championatTrackActive: true };
}
