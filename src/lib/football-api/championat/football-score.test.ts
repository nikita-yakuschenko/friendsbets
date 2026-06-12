import { describe, expect, it } from "vitest";
import {
  hasImplausibleStoredScore,
  isLikelyKickoffTime,
  isPlausibleFootballScore,
  parsePlausibleFootballScore,
  sanitizeStoredScore,
} from "@/lib/football-api/championat/football-score";

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

  it("отклоняет время начала 22:00 как счёт", () => {
    expect(isLikelyKickoffTime(22, 0)).toBe(true);
    expect(parsePlausibleFootballScore(22, 0)).toBeNull();
    expect(parsePlausibleFootballScore(0, 0)).toEqual({ homeScore: 0, awayScore: 0 });
    expect(parsePlausibleFootballScore(2, 1)).toEqual({ homeScore: 2, awayScore: 1 });
  });

  it("hasImplausibleStoredScore ловит 22:0 в БД", () => {
    expect(hasImplausibleStoredScore(22, 0)).toBe(true);
    expect(hasImplausibleStoredScore(0, 0)).toBe(false);
    expect(hasImplausibleStoredScore(null, 0)).toBe(false);
  });

  it("sanitizeStoredScore скрывает мусорный счёт", () => {
    expect(sanitizeStoredScore(22, 0)).toEqual({ homeScore: null, awayScore: null });
    expect(sanitizeStoredScore(1, 0)).toEqual({ homeScore: 1, awayScore: 0 });
  });
});
