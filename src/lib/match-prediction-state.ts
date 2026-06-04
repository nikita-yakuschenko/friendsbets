import { MatchStatus } from "@/generated/prisma/client";

/** Основное + доп. время + перерыв + запас на задержку синка Championat. */
export const MATCH_LIVE_TRACKING_MAX_MS = 3 * 60 * 60 * 1000;

export type MatchPredictionStateInput = {
  status: MatchStatus | string;
  startsAt: Date;
  homeScore: number | null;
  awayScore: number | null;
};

/** Только явный перенос с Championat (статус POSTPONED в БД). */
export function isMatchPostponed(match: MatchPredictionStateInput): boolean {
  return match.status === MatchStatus.POSTPONED;
}

export function isMatchLockedForPredictions(
  match: MatchPredictionStateInput,
): boolean {
  if (isMatchPostponed(match)) return false;
  if (match.status === MatchStatus.FINISHED) return true;
  if (match.status === MatchStatus.CANCELLED) return true;
  if (match.status === MatchStatus.LIVE) {
    return isMatchWithinLiveTrackingWindow(match);
  }
  return match.startsAt.getTime() <= Date.now();
}

/** Старт был не позже MAX_MS назад — иначе это не «лайв», а зависший статус в БД. */
export function isMatchWithinLiveTrackingWindow(
  match: MatchPredictionStateInput,
  referenceNow: Date = new Date(),
): boolean {
  const kickoff = match.startsAt.getTime();
  const now = referenceNow.getTime();
  if (kickoff > now) return false;
  return now - kickoff <= MATCH_LIVE_TRACKING_MAX_MS;
}

/** В БД ещё не FINISHED, но по времени матч давно должен был закончиться. */
export function isMatchStaleAwaitingResult(
  match: MatchPredictionStateInput,
  referenceNow: Date = new Date(),
): boolean {
  if (match.status === MatchStatus.FINISHED) return false;
  if (match.status === MatchStatus.CANCELLED) return false;
  if (isMatchPostponed(match)) return false;
  if (match.startsAt.getTime() > referenceNow.getTime()) return false;
  return !isMatchWithinLiveTrackingWindow(match, referenceNow);
}

/** Уже стартовал, но ещё не завершён (вкладка «Предстоящие», прогноз закрыт). */
export function isMatchInProgress(match: MatchPredictionStateInput): boolean {
  if (match.status === MatchStatus.FINISHED) return false;
  if (match.status === MatchStatus.CANCELLED) return false;
  if (isMatchPostponed(match)) return false;
  if (!isMatchWithinLiveTrackingWindow(match)) return false;
  if (match.status === MatchStatus.LIVE) return true;
  if (match.startsAt.getTime() > Date.now()) return false;
  // Уже должен был начаться; в БД ещё SCHEDULED, пока тянется синк с Championat
  return match.status === MatchStatus.SCHEDULED;
}
