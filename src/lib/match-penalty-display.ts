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
