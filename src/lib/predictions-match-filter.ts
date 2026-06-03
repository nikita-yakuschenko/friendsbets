import { MatchStatus } from "@/generated/prisma/client";
import {
  isMatchInProgress,
  isMatchPostponed,
  isMatchStaleAwaitingResult,
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

export function resolvePredictionsEmptyMessage(
  filter: PredictionsFilterId,
  items: Array<{ match: MatchPredictionStateInput }>,
): string {
  if (filter !== "upcoming") {
    return PREDICTIONS_FILTER_EMPTY[filter];
  }

  if (items.length === 0) {
    return "Календарь не загружен. Организатору: дождитесь синхронизации Championat или обновите шаблон в админке («Матчи и результаты» → «Обновить с Championat»).";
  }

  const hasUpcoming = items.some((item) =>
    matchPredictionsFilter(item.match, "upcoming"),
  );

  if (!hasUpcoming) {
    return "Все матчи турнира уже завершены или перенесены. Откройте вкладки «Завершённые» или «Все».";
  }

  return PREDICTIONS_FILTER_EMPTY.upcoming;
}

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

  if (filter === "all") return true;

  // На остальных вкладках перенесённые только отдельно
  if (postponed) return false;
  if (filter === "finished") {
    return (
      match.status === MatchStatus.FINISHED || isMatchStaleAwaitingResult(match)
    );
  }

  // Предстоящие: будущие + реально идущие; не зависшие «LIVE» с прошлой недели
  if (filter === "upcoming") {
    if (match.status === MatchStatus.FINISHED) return false;
    if (match.status === MatchStatus.CANCELLED) return false;
    if (isMatchPostponed(match)) return false;
    if (isMatchStaleAwaitingResult(match)) return false;
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
