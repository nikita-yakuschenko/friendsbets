import type { Match, Prediction, ScoringRule } from "@/generated/prisma/client";
import {
  scoreDifferenceDecides,
  scoreDryNumbers,
  scoreFootballClassic,
  scoreManyPoints,
  type ScoreInput,
  type ScoreResult,
} from "@/lib/scoring/rules";

export type { ScoreInput, ScoreResult };

export function buildScoreInput(
  prediction: Pick<Prediction, "homeScore" | "awayScore">,
  match: Pick<Match, "homeScore" | "awayScore">,
): ScoreInput | null {
  if (match.homeScore === null || match.awayScore === null) {
    return null;
  }

  return {
    predictedHome: prediction.homeScore,
    predictedAway: prediction.awayScore,
    actualHome: match.homeScore,
    actualAway: match.awayScore,
  };
}

export function calculatePredictionScore(
  prediction: Pick<Prediction, "homeScore" | "awayScore">,
  match: Pick<Match, "homeScore" | "awayScore" | "status">,
  scoringRule: Pick<ScoringRule, "code">,
): ScoreResult {
  if (match.status !== "FINISHED") {
    return { points: 0, reason: "Матч не завершён", tier: "none" };
  }

  const input = buildScoreInput(prediction, match);
  if (!input) {
    return { points: 0, reason: "Нет результата матча", tier: "none" };
  }

  switch (scoringRule.code) {
    case "FOOTBALL_CLASSIC":
      return scoreFootballClassic(input);
    case "MANY_POINTS":
      return scoreManyPoints(input);
    case "DIFFERENCE_DECIDES":
      return scoreDifferenceDecides(input);
    case "DRY_NUMBERS":
      return scoreDryNumbers(input);
    default:
      return scoreFootballClassic(input);
  }
}
