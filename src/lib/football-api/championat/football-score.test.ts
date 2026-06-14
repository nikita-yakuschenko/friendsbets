import { describe, expect, it } from "vitest";
import {
  hasImplausibleStoredScore,
  isLikelyKickoffTime,
  isPlausibleFootballScore,
  normalizeMatchScoresForDb,
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

  it("hasImplausibleStoredScore ловит время начала как счёт", () => {
    expect(hasImplausibleStoredScore(22, 0)).toBe(true);
    expect(hasImplausibleStoredScore(20, 0)).toBe(true);
    expect(hasImplausibleStoredScore(0, 0)).toBe(false);
    expect(hasImplausibleStoredScore(null, 0)).toBe(false);
  });

  it("normalizeMatchScoresForDb не хранит счёт у SCHEDULED", () => {
    const kickoff = new Date("2026-06-14T17:00:00Z");
    expect(
      normalizeMatchScoresForDb("SCHEDULED", kickoff, 20, 0, new Date("2026-06-14T12:00:00Z")),
    ).toEqual({ homeScore: null, awayScore: null });
  });

  it("normalizeMatchScoresForDb хранит счёт у FINISHED", () => {
    const kickoff = new Date("2026-06-14T17:00:00Z");
    expect(
      normalizeMatchScoresForDb("FINISHED", kickoff, 2, 1, new Date("2026-06-14T20:00:00Z")),
    ).toEqual({ homeScore: 2, awayScore: 1 });
  });

  it("sanitizeStoredScore скрывает мусорный счёт", () => {
    expect(sanitizeStoredScore(22, 0)).toEqual({ homeScore: null, awayScore: null });
    expect(sanitizeStoredScore(1, 0)).toEqual({ homeScore: 1, awayScore: 0 });
  });
});
