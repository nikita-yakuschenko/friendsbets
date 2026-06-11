import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { inferChampionatFinishedStatus } from "@/lib/football-api/championat/infer-championat-finished-status";
import { MATCH_LIVE_TRACKING_MAX_MS } from "@/lib/match-prediction-state";

describe("inferChampionatFinishedStatus", () => {
  const kickoff = new Date("2026-06-01T10:00:00Z");

  it("возвращает FINISHED для stale-матча со счётом", () => {
    const now = new Date(kickoff.getTime() + MATCH_LIVE_TRACKING_MAX_MS + 60_000);
    expect(
      inferChampionatFinishedStatus({
        match: {
          status: MatchStatus.LIVE,
          startsAt: kickoff,
          homeScore: 1,
          awayScore: 0,
        },
        snapshotHomeScore: 1,
        snapshotAwayScore: 0,
        now,
      }),
    ).toBe(MatchStatus.FINISHED);
  });

  it("не завершает матч без счёта на странице", () => {
    const now = new Date(kickoff.getTime() + MATCH_LIVE_TRACKING_MAX_MS + 60_000);
    expect(
      inferChampionatFinishedStatus({
        match: {
          status: MatchStatus.LIVE,
          startsAt: kickoff,
          homeScore: null,
          awayScore: null,
        },
        now,
      }),
    ).toBeUndefined();
  });

  it("не завершает активный лайв", () => {
    const now = new Date(kickoff.getTime() + 45 * 60_000);
    expect(
      inferChampionatFinishedStatus({
        match: {
          status: MatchStatus.LIVE,
          startsAt: kickoff,
          homeScore: 0,
          awayScore: 0,
        },
        snapshotHomeScore: 0,
        snapshotAwayScore: 0,
        livePhase: "live",
        now,
      }),
    ).toBeUndefined();
  });
});
