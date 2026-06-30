export function hasMatchPenaltyScore(
  homePenaltyScore: number | null | undefined,
  awayPenaltyScore: number | null | undefined,
): boolean {
  return homePenaltyScore != null && awayPenaltyScore != null;
}

export function formatMatchPenaltyScore(
  homePenaltyScore: number,
  awayPenaltyScore: number,
): string {
  return `${homePenaltyScore}:${awayPenaltyScore}`;
}

export function formatRegulationScoreLine(
  homeScore: number,
  awayScore: number,
): string {
  return `${homeScore} : ${awayScore}`;
}

export function formatPenaltySeriesLine(
  homePenaltyScore: number,
  awayPenaltyScore: number,
): string {
  return `пен. ${formatMatchPenaltyScore(homePenaltyScore, awayPenaltyScore)}`;
}

/** Счёт основного времени + серия пенальти, если была. */
export function formatMatchScoreWithPenalty(
  homeScore: number,
  awayScore: number,
  homePenaltyScore?: number | null,
  awayPenaltyScore?: number | null,
): string {
  const base = formatRegulationScoreLine(homeScore, awayScore);
  if (!hasMatchPenaltyScore(homePenaltyScore, awayPenaltyScore)) {
    return base;
  }
  return `${base} (${formatPenaltySeriesLine(homePenaltyScore!, awayPenaltyScore!)})`;
}

/** Компактный формат для уведомлений: 1:1 (пен. 3:4). */
export function formatCompactMatchScoreWithPenalty(
  homeScore: number,
  awayScore: number,
  homePenaltyScore?: number | null,
  awayPenaltyScore?: number | null,
): string {
  const base = `${homeScore}:${awayScore}`;
  if (!hasMatchPenaltyScore(homePenaltyScore, awayPenaltyScore)) {
    return base;
  }
  return `${base} (пен. ${formatMatchPenaltyScore(homePenaltyScore!, awayPenaltyScore!)})`;
}

export function getPenaltyWinnerSide(
  homePenaltyScore: number,
  awayPenaltyScore: number,
): "home" | "away" | null {
  if (homePenaltyScore === awayPenaltyScore) return null;
  return homePenaltyScore > awayPenaltyScore ? "home" : "away";
}

export function formatPenaltyOutcomeLine(
  homeTeamName: string,
  awayTeamName: string,
  homePenaltyScore: number,
  awayPenaltyScore: number,
): string {
  const side = getPenaltyWinnerSide(homePenaltyScore, awayPenaltyScore);
  if (!side) {
    return `Серия пенальти: ${formatMatchPenaltyScore(homePenaltyScore, awayPenaltyScore)}`;
  }
  const winner = side === "home" ? homeTeamName : awayTeamName;
  return `Исход по пенальти: ${winner} (${formatMatchPenaltyScore(homePenaltyScore, awayPenaltyScore)})`;
}
