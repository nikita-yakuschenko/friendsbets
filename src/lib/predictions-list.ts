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
  points: number;
};

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
