import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { buildScoreInput, calculatePredictionScore } from "@/lib/scoring/index";
import {
  buildSyntheticRegulationScore,
  isPenaltyDecidedDraw,
  resolvePointsScoringScore,
} from "@/lib/scoring/penalty-scoring-mode";
import { scoreManyPoints } from "@/lib/scoring/rules";

const penaltyDrawMatch = {
  homeScore: 1,
  awayScore: 1,
  homePenaltyScore: 3,
  awayPenaltyScore: 4,
  homeTeamId: "home",
  awayTeamId: "away",
  status: MatchStatus.FINISHED,
};

describe("penalty scoring", () => {
  it("определяет матч с пенальти при ничьей", () => {
    expect(isPenaltyDecidedDraw(penaltyDrawMatch)).toBe(true);
    expect(buildSyntheticRegulationScore(penaltyDrawMatch)).toEqual({
      homeScore: 1,
      awayScore: 2,
    });
  });

  it("классика: исход по пенальти, счёт основного времени", () => {
    const input = buildScoreInput(
      { homeScore: 0, awayScore: 2 },
      penaltyDrawMatch,
      { penaltyScoringSynthetic: false },
    );
    expect(input).toMatchObject({
      actualHome: 1,
      actualAway: 1,
      actualOutcomeOverride: "away",
    });
    expect(scoreManyPoints(input!)).toMatchObject({
      points: 3,
      tier: "outcome",
    });
  });

  it("альтернатива: синтетический счёт 1:2 даёт 6 очков", () => {
    const input = buildScoreInput(
      { homeScore: 1, awayScore: 2 },
      penaltyDrawMatch,
      { penaltyScoringSynthetic: true },
    );
    expect(input).toEqual({
      predictedHome: 1,
      predictedAway: 2,
      actualHome: 1,
      actualAway: 2,
    });
    expect(
      calculatePredictionScore(
        { homeScore: 1, awayScore: 2 },
        penaltyDrawMatch,
        { code: "MANY_POINTS" },
        { penaltyScoringSynthetic: true },
      ),
    ).toMatchObject({ points: 6, tier: "exact" });
  });

  it("resolvePointsScoringScore только при альтернативе", () => {
    expect(resolvePointsScoringScore(penaltyDrawMatch, false)).toBeNull();
    expect(resolvePointsScoringScore(penaltyDrawMatch, true)).toEqual({
      homeScore: 1,
      awayScore: 2,
    });
  });
});
