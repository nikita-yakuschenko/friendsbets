import { MatchStatus } from "@/generated/prisma/client";
import { getEffectiveKickoffAt } from "@/lib/match-kickoff-delay";
import {
  isMatchInProgress,
  isMatchPostponed,
  type MatchPredictionStateInput,
} from "@/lib/match-prediction-state";

type TeamLike = {
  externalId?: string | null;
};

type MatchLike = {
  homeTeam: TeamLike;
  awayTeam: TeamLike;
};

type ScheduleMatchCandidate = MatchLike &
  MatchPredictionStateInput & {
    status: MatchStatus;
  };

export function isPlaceholderTeamExternalId(
  externalId: string | null | undefined,
): boolean {
  if (!externalId) return true;
  if (externalId === "championat:0") return true;
  return externalId.startsWith("championat:slot:");
}

export function isMatchPredictable(match: MatchLike): boolean {
  return (
    !isPlaceholderTeamExternalId(match.homeTeam.externalId) &&
    !isPlaceholderTeamExternalId(match.awayTeam.externalId)
  );
}

/** Ближайший по расписанию матч, который ещё не начался для участников. */
export function findNextNotStartedMatch<T extends ScheduleMatchCandidate>(
  matches: Iterable<T>,
  now: Date = new Date(),
): T | null {
  const nowMs = now.getTime();
  let best: T | null = null;

  for (const match of matches) {
    if (
      match.status === MatchStatus.FINISHED ||
      match.status === MatchStatus.CANCELLED
    ) {
      continue;
    }
    if (isMatchPostponed(match)) continue;
    if (!isMatchPredictable(match)) continue;
    if (isMatchInProgress(match, now)) continue;
    if (getEffectiveKickoffAt(match.startsAt).getTime() <= nowMs) continue;

    if (!best || match.startsAt.getTime() < best.startsAt.getTime()) {
      best = match;
    }
  }

  return best;
}
