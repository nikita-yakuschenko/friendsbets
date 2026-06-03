import { describe, expect, it } from "vitest";
import { isPlausibleFootballScore } from "@/lib/football-api/championat/football-score";

describe("isPlausibleFootballScore", () => {
  it("принимает нормальный счёт", () => {
    expect(isPlausibleFootballScore(2, 1)).toBe(true);
  });

  it("отклоняет мусор парсера", () => {
    expect(isPlausibleFootballScore(66, 77)).toBe(false);
  });

  it("отклоняет отрицательные", () => {
    expect(isPlausibleFootballScore(-1, 0)).toBe(false);
  });
});
