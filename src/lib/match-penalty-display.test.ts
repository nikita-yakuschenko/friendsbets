import { describe, expect, it } from "vitest";
import {
  formatCompactMatchScoreWithPenalty,
  formatMatchScoreWithPenalty,
  formatPenaltyOutcomeLine,
  hasMatchPenaltyScore,
} from "@/lib/match-penalty-display";

describe("match-penalty-display", () => {
  it("форматирует счёт с пенальти", () => {
    expect(formatMatchScoreWithPenalty(1, 1, 3, 4)).toBe("1 : 1 (пен. 3:4)");
    expect(formatCompactMatchScoreWithPenalty(1, 1, 3, 4)).toBe("1:1 (пен. 3:4)");
    expect(formatMatchScoreWithPenalty(2, 0, null, null)).toBe("2 : 0");
  });

  it("описывает победителя по пенальти", () => {
    expect(formatPenaltyOutcomeLine("Германия", "Парагвай", 3, 4)).toBe(
      "Исход по пенальти: Парагвай (3:4)",
    );
  });

  it("hasMatchPenaltyScore требует оба значения", () => {
    expect(hasMatchPenaltyScore(3, 4)).toBe(true);
    expect(hasMatchPenaltyScore(3, null)).toBe(false);
  });
});
