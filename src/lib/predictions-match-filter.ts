import { MatchStatus } from "@/generated/prisma/client";
import {
  isMatchPostponed,
  type MatchPredictionStateInput,
} from "@/lib/match-prediction-state";

export const PREDICTIONS_FILTER_IDS = [
  "upcoming",
  "postponed",
  "finished",
  "all",
] as const;

export type PredictionsFilterId = (typeof PREDICTIONS_FILTER_IDS)[number];

export const PREDICTIONS_FILTER_LABELS: Record<PredictionsFilterId, string> = {
  upcoming: "Предстоящие",
  postponed: "Перенесённые",
  finished: "Завершённые",
  all: "Все",
};

export const PREDICTIONS_FILTER_EMPTY: Record<PredictionsFilterId, string> = {
  upcoming: "Нет предстоящих матчей.",
  postponed: "Нет перенесённых матчей.",
  finished: "Нет завершённых матчей.",
  all: "Матчей пока нет.",
};

export function parsePredictionsFilter(
  raw: string | undefined,
): PredictionsFilterId {
  if (raw && PREDICTIONS_FILTER_IDS.includes(raw as PredictionsFilterId)) {
    return raw as PredictionsFilterId;
  }
  return "upcoming";
}

export function matchPredictionsFilter(
  match: MatchPredictionStateInput,
  filter: PredictionsFilterId,
): boolean {
  const postponed = isMatchPostponed(match);

  if (filter === "postponed") return postponed;

  // Перенесённые только на своей вкладке — не в общей массе
  if (postponed) return false;

  if (filter === "all") return true;
  if (filter === "finished") {
    return match.status === MatchStatus.FINISHED;
  }

  return (
    match.status !== MatchStatus.FINISHED &&
    match.status !== MatchStatus.CANCELLED
  );
}

export function emptyPredictionsFilterCounts(): Record<
  PredictionsFilterId,
  number
> {
  return Object.fromEntries(
    PREDICTIONS_FILTER_IDS.map((id) => [id, 0]),
  ) as Record<PredictionsFilterId, number>;
}
