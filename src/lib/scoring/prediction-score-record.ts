/** Одна запись PredictionScore на прогноз; при дублях в БД берём самую свежую. */
export type PredictionScoreRow = {
  id: string;
  points: number;
  reason: string;
  calculatedAt: Date;
};

export function pickCanonicalPredictionScore(
  scores: PredictionScoreRow[],
): PredictionScoreRow | null {
  if (scores.length === 0) return null;

  return scores.reduce((latest, score) =>
    score.calculatedAt.getTime() >= latest.calculatedAt.getTime()
      ? score
      : latest,
  );
}

export function sumPredictionScorePoints(scores: PredictionScoreRow[]): number {
  return pickCanonicalPredictionScore(scores)?.points ?? 0;
}
