import { MatchStatus } from "@/generated/prisma/client";
import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-status";
import {
  isMatchStaleAwaitingResult,
  MATCH_LIVE_TRACKING_MAX_MS,
  type MatchPredictionStateInput,
} from "@/lib/match-prediction-state";

const ACTIVE_LIVE_PHASES = new Set<ChampionatLivePhase>([
  "live",
  "halftime",
  "extra_time",
  "penalties",
]);

export type InferChampionatFinishedInput = {
  match: MatchPredictionStateInput;
  snapshotHomeScore?: number;
  snapshotAwayScore?: number;
  livePhase?: ChampionatLivePhase;
  now?: Date;
};

/** Счёт на странице Championat + матч давно не в лайве → FINISHED. */
export function inferChampionatFinishedStatus(
  input: InferChampionatFinishedInput,
): MatchStatus | undefined {
  const { match } = input;
  if (match.status === MatchStatus.FINISHED) return undefined;
  if (match.status === MatchStatus.CANCELLED) return undefined;

  const now = input.now ?? new Date();
  const hasSnapshotScore =
    input.snapshotHomeScore !== undefined &&
    input.snapshotAwayScore !== undefined;
  if (!hasSnapshotScore) return undefined;

  if (input.livePhase === "finished") return MatchStatus.FINISHED;

  if (isMatchStaleAwaitingResult(match, now)) {
    return MatchStatus.FINISHED;
  }

  const pastLiveWindow =
    now.getTime() > match.startsAt.getTime() + MATCH_LIVE_TRACKING_MAX_MS;
  const phaseStillActive =
    input.livePhase !== undefined && ACTIVE_LIVE_PHASES.has(input.livePhase);

  if (pastLiveWindow && !phaseStillActive) {
    return MatchStatus.FINISHED;
  }

  return undefined;
}
