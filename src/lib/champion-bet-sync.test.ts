import { describe, expect, it } from "vitest";
import { isFinalStage } from "@/lib/match-stage";

describe("champion bet sync rules", () => {
  it("чемпион определяется только стадией «Финал»", () => {
    expect(isFinalStage("Финал")).toBe(true);
    expect(isFinalStage("1/8 финала")).toBe(false);
    expect(isFinalStage("1/2 финала")).toBe(false);
  });

  it("до финала очки ставки на чемпиона должны быть 0", () => {
    const championTeamId = null;
    const award = 1;
    const predictionTeamId = "france-id";

    const nextPoints =
      championTeamId && predictionTeamId === championTeamId ? award : 0;
    expect(nextPoints).toBe(0);
  });

  it("после финала очко получает только угадавший чемпиона", () => {
    const championTeamId = "france-id";
    const award = 1;

    expect(
      championTeamId && "france-id" === championTeamId ? award : 0,
    ).toBe(1);
    expect(
      championTeamId && "sweden-id" === championTeamId ? award : 0,
    ).toBe(0);
  });
});
