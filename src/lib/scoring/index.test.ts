import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { buildScoreInput, calculatePredictionScore } from "@/lib/scoring/index";

const match = (
  partial: Partial<{
    homeScore: number | null;
    awayScore: number | null;
    status: MatchStatus;
    homePenaltyScore: number | null;
    awayPenaltyScore: number | null;
  }> = {},
) => ({
  homeScore: 0,
  awayScore: 0,
  status: MatchStatus.SCHEDULED,
  homePenaltyScore: null,
  awayPenaltyScore: null,
  ...partial,
});

describe("buildScoreInput", () => {
  it("возвращает null без счёта матча", () => {
    expect(
      buildScoreInput(
        { homeScore: 1, awayScore: 0 },
        match({ homeScore: null, awayScore: 1 }),
      ),
    ).toBeNull();
  });

  it("собирает входные данные", () => {
    expect(
      buildScoreInput(
        { homeScore: 2, awayScore: 1 },
        match({ homeScore: 3, awayScore: 0 }),
      ),
    ).toEqual({
      predictedHome: 2,
      predictedAway: 1,
      actualHome: 3,
      actualAway: 0,
    });
  });
});

describe("calculatePredictionScore", () => {
  const prediction = { homeScore: 2, awayScore: 1 };
  const finished = match({
    homeScore: 2,
    awayScore: 1,
    status: MatchStatus.FINISHED,
  });
  const scheduled = match({
    homeScore: 0,
    awayScore: 0,
    status: MatchStatus.SCHEDULED,
  });

  it("не начисляет до FINISHED", () => {
    expect(
      calculatePredictionScore(prediction, scheduled, { code: "FOOTBALL_CLASSIC" }),
    ).toMatchObject({ points: 0, reason: "Матч не завершён" });
  });

  it("считает по правилу FOOTBALL_CLASSIC", () => {
    expect(
      calculatePredictionScore(prediction, finished, { code: "FOOTBALL_CLASSIC" }),
    ).toMatchObject({ points: 3, tier: "exact" });
  });

  it("fallback на classic для неизвестного кода", () => {
    expect(
      calculatePredictionScore(
        { homeScore: 2, awayScore: 1 },
        finished,
        { code: "UNKNOWN" },
      ),
    ).toMatchObject({ points: 3 });
  });

  it("считает по MANY_POINTS", () => {
    expect(
      calculatePredictionScore(
        { homeScore: 3, awayScore: 2 },
        match({ homeScore: 2, awayScore: 1, status: MatchStatus.FINISHED }),
        { code: "MANY_POINTS" },
      ),
    ).toMatchObject({ points: 5, tier: "outcome_and_diff" });
  });
});
