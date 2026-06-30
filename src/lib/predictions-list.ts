import { MatchStatus } from "@/generated/prisma/client";
import type { PredictionsFilterId } from "@/lib/predictions-match-filter";

export type PredictionMatchRow = {
  id: string;
  startsAt: Date;
  status: string;
  stage: string | null;
  venueName: string | null;
  venueCity: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  championatFinishedAt?: Date | null;
  updatedAt?: Date;
  homeTeam: { name: string; shortName: string; countryCode?: string | null };
  awayTeam: { name: string; shortName: string; countryCode?: string | null };
};

export type PredictionStageGroupSortMode = "upcoming" | "finished";

const byKickoffAsc = (a: PredictionMatchItem, b: PredictionMatchItem) =>
  new Date(a.match.startsAt).getTime() - new Date(b.match.startsAt).getTime();

/** Идущие: позже стартовал → выше (меньше времени с начала). */
const byKickoffDesc = (a: PredictionMatchItem, b: PredictionMatchItem) =>
  new Date(b.match.startsAt).getTime() - new Date(a.match.startsAt).getTime();

/**
 * Момент для сортировки завершённых: когда зафиксировали FINISHED на Championat,
 * иначе дата/время старта (не updatedAt — это время синка в БД, ломает порядок).
 */
export function predictionMatchFinishedSortAt(
  item: PredictionMatchItem,
): number {
  const m = item.match;
  if (m.championatFinishedAt) {
    return new Date(m.championatFinishedAt).getTime();
  }
  return new Date(m.startsAt).getTime();
}

/** Завершённые: недавно закончился → выше. */
const byFinishedDesc = (a: PredictionMatchItem, b: PredictionMatchItem) =>
  predictionMatchFinishedSortAt(b) - predictionMatchFinishedSortAt(a);

export function isFinishedPredictionItem(item: PredictionMatchItem): boolean {
  return (
    item.match.status === MatchStatus.FINISHED || item.staleAwaitingResult
  );
}

export type PredictionMatchItem = {
  match: PredictionMatchRow;
  canPredict: boolean;
  prediction: { homeScore: number; awayScore: number } | null;
  locked: boolean;
  postponed: boolean;
  inProgress: boolean;
  /** В БД ещё не FINISHED, но матч давно должен был закончиться. */
  staleAwaitingResult: boolean;
  points: number;
  /** Причина начисления из PredictionScore (например «Точный счёт»). */
  scoreReason: string | null;
};

/** Идущие отдельно сверху страницы; остальные — в группах по турам. */
export function partitionUpcomingPredictionItems(
  items: PredictionMatchItem[],
): {
  inProgress: PredictionMatchItem[];
  upcoming: PredictionMatchItem[];
} {
  const inProgress: PredictionMatchItem[] = [];
  const upcoming: PredictionMatchItem[] = [];

  for (const item of items) {
    if (item.inProgress) inProgress.push(item);
    else upcoming.push(item);
  }

  inProgress.sort(byKickoffDesc);
  upcoming.sort(byKickoffAsc);

  return { inProgress, upcoming };
}

export function isPostponedPredictionItem(item: PredictionMatchItem): boolean {
  return item.postponed || item.match.status === MatchStatus.POSTPONED;
}

export function sortPostponedPredictionItems(
  items: PredictionMatchItem[],
): PredictionMatchItem[] {
  return [...items].sort(byKickoffAsc);
}

/** Вкладка «Все»: идущие → предстоящие → завершённые → перенесённые. */
export function partitionAllPredictionItems(
  items: PredictionMatchItem[],
): {
  inProgress: PredictionMatchItem[];
  upcoming: PredictionMatchItem[];
  finished: PredictionMatchItem[];
  postponed: PredictionMatchItem[];
} {
  const inProgress: PredictionMatchItem[] = [];
  const upcoming: PredictionMatchItem[] = [];
  const finished: PredictionMatchItem[] = [];
  const postponed: PredictionMatchItem[] = [];

  for (const item of items) {
    if (isPostponedPredictionItem(item)) {
      postponed.push(item);
      continue;
    }
    if (item.inProgress) inProgress.push(item);
    else if (isFinishedPredictionItem(item)) finished.push(item);
    else upcoming.push(item);
  }

  inProgress.sort(byKickoffDesc);
  upcoming.sort(byKickoffAsc);
  finished.sort(byFinishedDesc);
  postponed.sort(byKickoffAsc);

  return { inProgress, upcoming, finished, postponed };
}

export function sortFinishedPredictionItems(
  items: PredictionMatchItem[],
): PredictionMatchItem[] {
  return [...items].sort(byFinishedDesc);
}

export function sortPredictionItemsForFilter(
  items: PredictionMatchItem[],
  filter: PredictionsFilterId,
): PredictionMatchItem[] {
  if (filter === "upcoming") {
    return partitionUpcomingPredictionItems(items).upcoming;
  }
  if (filter === "finished") {
    return sortFinishedPredictionItems(items);
  }
  if (filter === "all") {
    const { inProgress, upcoming, finished, postponed } =
      partitionAllPredictionItems(items);
    return [...inProgress, ...upcoming, ...finished, ...postponed];
  }
  return items;
}

function buildChronologicalStageGroups(
  items: PredictionMatchItem[],
  mode: PredictionStageGroupSortMode = "upcoming",
): { id: string; stage: string; items: PredictionMatchItem[] }[] {
  const sorted = [...items].sort(
    mode === "finished" ? byFinishedDesc : byKickoffAsc,
  );
  const groups: { id: string; stage: string; items: PredictionMatchItem[] }[] =
    [];

  for (const item of sorted) {
    const stage = item.match.stage?.trim() || "Матч";
    const last = groups[groups.length - 1];
    if (last && last.stage === stage) {
      last.items.push(item);
    } else {
      groups.push({ id: item.match.id, stage, items: [item] });
    }
  }

  return groups;
}

/** Предстоящие матчи строго по расписанию (kickoff ↑). */
export function sortUpcomingPredictionsBySchedule(
  items: PredictionMatchItem[],
): PredictionMatchItem[] {
  return [...items].sort(byKickoffAsc);
}

export function buildPredictionStageGroups(
  items: PredictionMatchItem[],
  mode: PredictionStageGroupSortMode = "upcoming",
) {
  return buildChronologicalStageGroups(items, mode);
}
