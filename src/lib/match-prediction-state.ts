import { MatchStatus } from "@/generated/prisma/client";

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
  if (isMatchPostponed(match)) return true;
  if (match.status === MatchStatus.FINISHED) return true;
  if (match.status === MatchStatus.CANCELLED) return true;
  if (match.status === MatchStatus.LIVE) return true;
  return match.startsAt.getTime() <= Date.now();
}

/** Уже стартовал, но ещё не завершён (вкладка «Предстоящие», прогноз закрыт). */
export function isMatchInProgress(match: MatchPredictionStateInput): boolean {
  if (match.status === MatchStatus.FINISHED) return false;
  if (match.status === MatchStatus.CANCELLED) return false;
  if (isMatchPostponed(match)) return false;
  if (match.status === MatchStatus.LIVE) return true;
  if (match.startsAt.getTime() > Date.now()) return false;
  // Уже должен был начаться; в БД ещё SCHEDULED, пока тянется синк с Championat
  return match.status === MatchStatus.SCHEDULED;
}
