import { describe, expect, it } from "vitest";
import { deriveMatchWinnerTeamId, deriveWinnerTeamId } from "@/lib/utils";

describe("deriveWinnerTeamId", () => {
  it("возвращает хозяев при победе дома", () => {
    expect(deriveWinnerTeamId(2, 1, "home", "away")).toBe("home");
  });

  it("возвращает null при ничьей", () => {
    expect(deriveWinnerTeamId(1, 1, "home", "away")).toBeNull();
  });
});

describe("deriveMatchWinnerTeamId", () => {
  it("использует winnerTeamId если задан", () => {
    expect(
      deriveMatchWinnerTeamId({
        homeScore: 1,
        awayScore: 0,
        homeTeamId: "h",
        awayTeamId: "a",
        winnerTeamId: "preset",
      }),
    ).toBe("preset");
  });

  it("определяет победителя по пенальти при ничьей в основное время", () => {
    expect(
      deriveMatchWinnerTeamId({
        homeScore: 1,
        awayScore: 1,
        homePenaltyScore: 3,
        awayPenaltyScore: 4,
        homeTeamId: "home",
        awayTeamId: "away",
        winnerTeamId: null,
      }),
    ).toBe("away");
  });
});
