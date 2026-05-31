export type ScorePrediction = {
  homeScore: number;
  awayScore: number;
};

export type LivePredictionStats = {
  total: number;
  mostCommonScore: string | null;
  mostCommonCount: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  exactAtCurrentScore: number | null;
};

export function computeLivePredictionStats(
  predictions: ScorePrediction[],
  liveScore?: { home: number; away: number } | null,
): LivePredictionStats | null {
  if (predictions.length === 0) return null;

  const scoreCounts = new Map<string, number>();
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let exactAtCurrentScore = 0;

  for (const prediction of predictions) {
    const key = `${prediction.homeScore}:${prediction.awayScore}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);

    if (prediction.homeScore > prediction.awayScore) homeWin += 1;
    else if (prediction.homeScore < prediction.awayScore) awayWin += 1;
    else draw += 1;

    if (
      liveScore &&
      prediction.homeScore === liveScore.home &&
      prediction.awayScore === liveScore.away
    ) {
      exactAtCurrentScore += 1;
    }
  }

  const mostCommon = [...scoreCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    total: predictions.length,
    mostCommonScore: mostCommon?.[0] ?? null,
    mostCommonCount: mostCommon?.[1] ?? 0,
    homeWin,
    draw,
    awayWin,
    exactAtCurrentScore: liveScore ? exactAtCurrentScore : null,
  };
}
