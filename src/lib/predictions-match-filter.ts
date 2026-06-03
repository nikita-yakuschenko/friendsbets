import { MatchStatus } from "@/generated/prisma/client";
import {
  isMatchInProgress,
  isMatchPostponed,
  type MatchPredictionStateInput,
} from "@/lib/match-prediction-state";

export const PREDICTIONS_FILTER_IDS = [
  "upcoming",
  "finished",
  "all",
  "postponed",
] as const;

export type PredictionsFilterId = (typeof PREDICTIONS_FILTER_IDS)[number];

export const PREDICTIONS_FILTER_LABELS: Record<PredictionsFilterId, string> = {
  upcoming: "Предстоящие",
  postponed: "Перенесённые",
  finished: "Завершённые",
  all: "Все",
};

export const PREDICTIONS_FILTER_EMPTY: Record<PredictionsFilterId, string> = {
  upcoming: "Нет предстоящих и идущих матчей.",
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

  // Предстоящие: будущие + уже идущие (прогноз закрыт); не завершённые и не перенесённые
  if (filter === "upcoming") {
    if (match.status === MatchStatus.FINISHED) return false;
    if (match.status === MatchStatus.CANCELLED) return false;
    if (isMatchPostponed(match)) return false;
    return true;
  }

  return true;
}

export function countInProgressInUpcoming(
  items: { match: MatchPredictionStateInput }[],
): number {
  return items.filter(
    (item) =>
      matchPredictionsFilter(item.match, "upcoming") &&
      isMatchInProgress(item.match),
  ).length;
}

export function emptyPredictionsFilterCounts(): Record<
  PredictionsFilterId,
  number
> {
  return Object.fromEntries(
    PREDICTIONS_FILTER_IDS.map((id) => [id, 0]),
  ) as Record<PredictionsFilterId, number>;
}
