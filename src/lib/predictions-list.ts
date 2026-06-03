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
  homeTeam: { name: string; shortName: string; countryCode?: string | null };
  awayTeam: { name: string; shortName: string; countryCode?: string | null };
};

export type PredictionMatchItem = {
  match: PredictionMatchRow;
  canPredict: boolean;
  prediction: { homeScore: number; awayScore: number } | null;
  locked: boolean;
  postponed: boolean;
  inProgress: boolean;
  points: number;
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

  const byStartDesc = (a: PredictionMatchItem, b: PredictionMatchItem) =>
    new Date(b.match.startsAt).getTime() -
    new Date(a.match.startsAt).getTime();
  const byStartAsc = (a: PredictionMatchItem, b: PredictionMatchItem) =>
    new Date(a.match.startsAt).getTime() -
    new Date(b.match.startsAt).getTime();

  inProgress.sort(byStartDesc);
  upcoming.sort(byStartAsc);

  return { inProgress, upcoming };
}

export function sortPredictionItemsForFilter(
  items: PredictionMatchItem[],
  filter: PredictionsFilterId,
): PredictionMatchItem[] {
  if (filter !== "upcoming") return items;
  return partitionUpcomingPredictionItems(items).upcoming;
}

export function buildPredictionStageGroups(items: PredictionMatchItem[]) {
  const byStage = new Map<string, PredictionMatchItem[]>();
  for (const item of items) {
    const stage = item.match.stage?.trim() || "Матч";
    const bucket = byStage.get(stage);
    if (bucket) bucket.push(item);
    else byStage.set(stage, [item]);
  }

  return [...byStage.entries()]
    .map(([stage, groupItems]) => {
      const sorted = [...groupItems].sort(
        (a, b) =>
          new Date(a.match.startsAt).getTime() -
          new Date(b.match.startsAt).getTime(),
      );
      return {
        id: sorted[0]!.match.id,
        stage,
        items: sorted,
        sortAt: new Date(sorted[0]!.match.startsAt).getTime(),
      };
    })
    .sort((a, b) => a.sortAt - b.sortAt)
    .map(({ id, stage, items: groupItems }) => ({ id, stage, items: groupItems }));
}
