import { describe, expect, it, vi, afterEach } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { findNextNotStartedMatch } from "@/lib/football-api/match-visibility";

function match(
  id: string,
  startsAt: Date,
  status: MatchStatus = MatchStatus.SCHEDULED,
) {
  return {
    id,
    startsAt,
    status,
    homeTeam: { externalId: `championat:team:${id}-h` },
    awayTeam: { externalId: `championat:team:${id}-a` },
  };
}

describe("findNextNotStartedMatch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("выбирает ближайший SCHEDULED, пропуская уже идущие LIVE", () => {
    const now = new Date("2026-06-13T23:55:00Z");
    const next = findNextNotStartedMatch(
      [
        match("m1-live", new Date("2026-06-13T20:00:00Z"), MatchStatus.LIVE),
        match("m3", new Date("2026-06-14T00:00:00Z")),
        match("m4", new Date("2026-06-14T04:00:00Z")),
      ],
      now,
    );

    expect(next?.id).toBe("m3");
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
});
