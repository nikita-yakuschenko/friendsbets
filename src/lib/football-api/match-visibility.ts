type TeamLike = {
  externalId?: string | null;
};

type MatchLike = {
  homeTeam: TeamLike;
  awayTeam: TeamLike;
};

export function isPlaceholderTeamExternalId(
  externalId: string | null | undefined,
): boolean {
  if (!externalId) return true;
  if (externalId === "championat:0") return true;
  return externalId.startsWith("championat:slot:");
}

export function isMatchPredictable(match: MatchLike): boolean {
  return (
    !isPlaceholderTeamExternalId(match.homeTeam.externalId) &&
    !isPlaceholderTeamExternalId(match.awayTeam.externalId)
  );
}
