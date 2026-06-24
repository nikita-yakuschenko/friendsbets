import { describe, expect, it, vi, afterEach } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import {
  findNextNotStartedMatch,
  findNextNotStartedMatches,
} from "@/lib/football-api/match-visibility";

function match(
  id: string,
  startsAt: Date,
  status: MatchStatus = MatchStatus.SCHEDULED,
) {
  return {
    id,
    startsAt,
    status,
    homeScore: null,
    awayScore: null,
    homeTeam: { externalId: `championat:team:${id}-h` },
    awayTeam: { externalId: `championat:team:${id}-a` },
  };
}

describe("findNextNotStartedMatch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("не отбрасывает ранний LIVE до effective kickoff (04:00 МСК vs 22:00)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T21:45:00.000Z")); // 00:45 МСК, 13 июня

    const next = findNextNotStartedMatch([
      match("usa", new Date("2026-06-13T01:00:00.000Z"), MatchStatus.LIVE),
      match("qat", new Date("2026-06-13T19:00:00.000Z")),
    ]);

    expect(next?.id).toBe("usa");
    vi.useRealTimers();
  });

  it("пропускает матч, который уже идёт для участников", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T23:55:00Z"));
    const next = findNextNotStartedMatch(
      [
        match("m1-live", new Date("2026-06-13T20:00:00Z"), MatchStatus.LIVE),
        match("m3", new Date("2026-06-14T00:00:00Z")),
        match("m4", new Date("2026-06-14T04:00:00Z")),
      ],
    );

    expect(next?.id).toBe("m3");
    vi.useRealTimers();
  });

  it("не возвращает матч после effective kickoff", () => {
    const kickoff = new Date("2026-06-13T20:00:00Z");
    const now = new Date("2026-06-13T20:04:00Z");
    const next = findNextNotStartedMatch(
      [
        match("past", kickoff),
        match("future", new Date("2026-06-13T23:00:00Z")),
      ],
      now,
    );

    expect(next?.id).toBe("future");
  });

  it("возвращает все ближайшие матчи с одинаковым временем старта", () => {
    const kickoff = new Date("2026-06-13T20:00:00Z");
    const later = new Date("2026-06-13T23:00:00Z");
    const now = new Date("2026-06-13T18:00:00Z");

    const next = findNextNotStartedMatches(
      [match("m1", kickoff), match("m2", kickoff), match("m3", later)],
      now,
    );

    expect(next.map((item) => item.id)).toEqual(["m1", "m2"]);
  });
});
