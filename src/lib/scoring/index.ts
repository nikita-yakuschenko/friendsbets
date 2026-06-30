import type { Match, Prediction, ScoringRule } from "@/generated/prisma/client";
import {
  buildSyntheticRegulationScore,
  isPenaltyDecidedDraw,
} from "@/lib/scoring/penalty-scoring-mode";
import { getPenaltyWinnerSide } from "@/lib/match-penalty-display";
import {
  scoreDifferenceDecides,
  scoreDryNumbers,
  scoreFootballClassic,
  scoreManyPoints,
  type ScoreInput,
  type ScoreResult,
} from "@/lib/scoring/rules";

export type { ScoreInput, ScoreResult };

export type ScoringGameOptions = {
  penaltyScoringSynthetic?: boolean;
};

export type MatchForScoring = Pick<
  Match,
  | "homeScore"
  | "awayScore"
  | "homePenaltyScore"
  | "awayPenaltyScore"
  | "status"
>;

export function buildScoreInput(
  prediction: Pick<Prediction, "homeScore" | "awayScore">,
  match: MatchForScoring,
  options?: ScoringGameOptions,
): ScoreInput | null {
  if (match.homeScore === null || match.awayScore === null) {
    return null;
  }

  const base: ScoreInput = {
    predictedHome: prediction.homeScore,
    predictedAway: prediction.awayScore,
    actualHome: match.homeScore,
    actualAway: match.awayScore,
  };

  if (!isPenaltyDecidedDraw(match)) {
    return base;
  }

  if (options?.penaltyScoringSynthetic) {
    const synthetic = buildSyntheticRegulationScore(match);
    if (synthetic) {
      return {
        ...base,
        actualHome: synthetic.homeScore,
        actualAway: synthetic.awayScore,
      };
    }
    return base;
  }

  const side = getPenaltyWinnerSide(
    match.homePenaltyScore!,
    match.awayPenaltyScore!,
  );
  if (!side) return base;

  return {
    ...base,
    actualOutcomeOverride: side,
  };
}

export function calculatePredictionScore(
  prediction: Pick<Prediction, "homeScore" | "awayScore">,
  match: MatchForScoring,
  scoringRule: Pick<ScoringRule, "code">,
  options?: ScoringGameOptions,
): ScoreResult {
  if (match.status !== "FINISHED") {
    return { points: 0, reason: "Матч не завершён", tier: "none" };
  }

  const input = buildScoreInput(prediction, match, options);
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
