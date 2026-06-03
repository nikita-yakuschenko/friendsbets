import { MatchStatus } from "@/generated/prisma/client";

export type MatchPredictionStateInput = {
  status: MatchStatus | string;
  startsAt: Date;
  homeScore: number | null;
  awayScore: number | null;
};

/** Перенос в БД или «застрявший» SCHEDULED после старта без счёта. */
export function isMatchPostponed(match: MatchPredictionStateInput): boolean {
  if (match.status === MatchStatus.POSTPONED) return true;
  if (match.status !== MatchStatus.SCHEDULED) return false;
  if (match.startsAt.getTime() > Date.now()) return false;
  if (match.homeScore != null || match.awayScore != null) return false;
  return true;
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
  if (match.status === MatchStatus.POSTPONED || isMatchPostponed(match)) {
    return false;
  }
  if (match.status === MatchStatus.LIVE) return true;
  if (match.startsAt.getTime() > Date.now()) return false;
  return (
    match.status === MatchStatus.SCHEDULED &&
    (match.homeScore != null || match.awayScore != null)
  );
}
