import { MatchStatus } from "@/generated/prisma/client";

export const PREDICTIONS_FILTER_IDS = ["upcoming", "finished", "all"] as const;

export type PredictionsFilterId = (typeof PREDICTIONS_FILTER_IDS)[number];

export const PREDICTIONS_FILTER_LABELS: Record<PredictionsFilterId, string> = {
  upcoming: "Предстоящие",
  finished: "Завершённые",
  all: "Все",
};

export const PREDICTIONS_FILTER_EMPTY: Record<PredictionsFilterId, string> = {
  upcoming: "Нет предстоящих матчей.",
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
  status: MatchStatus,
  filter: PredictionsFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "finished") {
    return status === MatchStatus.FINISHED;
  }
  return status !== MatchStatus.FINISHED && status !== MatchStatus.CANCELLED;
}
