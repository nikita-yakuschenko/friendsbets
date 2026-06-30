import { describe, expect, it } from "vitest";
import {
  scoreDifferenceDecides,
  scoreDryNumbers,
  scoreFootballClassic,
  scoreManyPoints,
} from "@/lib/scoring/rules";

const actual = { actualHome: 2, actualAway: 1 };

describe("scoreFootballClassic", () => {
  it("даёт 3 очка за точный счёт", () => {
    expect(scoreFootballClassic({ ...actual, predictedHome: 2, predictedAway: 1 })).toEqual({
      points: 3,
      reason: "Точный счёт",
      tier: "exact",
    });
  });

  it("даёт 1 очко за исход с override", () => {
    expect(
      scoreFootballClassic({
        ...actual,
        predictedHome: 3,
        predictedAway: 0,
        actualOutcomeOverride: "home",
      }),
    ).toMatchObject({
      points: 1,
      tier: "outcome",
    });
  });

  it("даёт 1 очко за исход", () => {
    expect(scoreFootballClassic({ ...actual, predictedHome: 3, predictedAway: 0 })).toMatchObject({
      points: 1,
      tier: "outcome",
    });
  });

  it("даёт 0 при промахе", () => {
    expect(scoreFootballClassic({ ...actual, predictedHome: 0, predictedAway: 2 }).points).toBe(0);
  });
});

describe("scoreManyPoints", () => {
  it("даёт 6 за точный счёт", () => {
    expect(scoreManyPoints({ ...actual, predictedHome: 2, predictedAway: 1 }).points).toBe(6);
  });

  it("даёт 5 за исход и разницу", () => {
    expect(scoreManyPoints({ ...actual, predictedHome: 3, predictedAway: 2 }).tier).toBe(
      "outcome_and_diff",
    );
  });

  it("даёт 1 за голы одной команды без исхода", () => {
    expect(scoreManyPoints({ ...actual, predictedHome: 0, predictedAway: 1 }).tier).toBe(
      "team_goals",
    );
  });
});

describe("scoreDifferenceDecides", () => {
  it("даёт 2 за исход и разницу", () => {
    expect(
      scoreDifferenceDecides({ ...actual, predictedHome: 3, predictedAway: 2 }).points,
    ).toBe(2);
  });

  it("даёт 1 только за исход", () => {
    expect(
      scoreDifferenceDecides({ ...actual, predictedHome: 4, predictedAway: 1 }).points,
    ).toBe(1);
  });

  it("даёт 0 при неверном исходе", () => {
    expect(
      scoreDifferenceDecides({ ...actual, predictedHome: 0, predictedAway: 2 }).points,
    ).toBe(0);
  });
});

describe("scoreDryNumbers", () => {
  it("даёт 4 за точный счёт", () => {
    expect(scoreDryNumbers({ ...actual, predictedHome: 2, predictedAway: 1 }).points).toBe(4);
  });

  it("даёт 3 за исход и голы команды", () => {
    expect(scoreDryNumbers({ ...actual, predictedHome: 2, predictedAway: 0 }).tier).toBe(
      "outcome_and_team_goals",
    );
  });

  it("даёт 2 только за исход", () => {
    expect(scoreDryNumbers({ ...actual, predictedHome: 3, predictedAway: 2 }).points).toBe(2);
  });

  it("даёт 1 за голы одной команды", () => {
    expect(scoreDryNumbers({ ...actual, predictedHome: 0, predictedAway: 1 }).points).toBe(1);
  });
});
