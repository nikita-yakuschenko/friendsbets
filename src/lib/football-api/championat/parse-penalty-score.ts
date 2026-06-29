import { parsePlausibleFootballScore } from "@/lib/football-api/championat/football-score";

/** Серия пенальти с блока match-info__score-extra на Championat. */
export function parseChampionatPenaltyScoreFromHtml(
  html: string,
): { homePenaltyScore: number; awayPenaltyScore: number } | null {
  const match = html.match(
    /match-info__score-extra[^>]*>\s*(\d+)\s*:\s*(\d+)/i,
  );
  if (!match) return null;

  const parsed = parsePlausibleFootballScore(
    Number(match[1]),
    Number(match[2]),
  );
  if (!parsed) return null;

  return {
    homePenaltyScore: parsed.homeScore,
    awayPenaltyScore: parsed.awayScore,
  };
}
