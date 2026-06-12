import { describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import {
  CHAMPIONAT_STALE_RETRY_MS,
  CHAMPIONAT_STALE_WITH_SCORE_RETRY_MS,
  isChampionatBiDailyPollDay,
  kickoffWallClockMinutesWithOffset,
  shouldPollChampionatMatchNow,
} from "@/lib/football-api/championat/match-sync-schedule";

describe("match-sync-schedule", () => {
  it("isChampionatBiDailyPollDay для дней 7,5,3", () => {
    expect(isChampionatBiDailyPollDay(7)).toBe(true);
    expect(isChampionatBiDailyPollDay(6)).toBe(false);
    expect(isChampionatBiDailyPollDay(2)).toBe(false);
  });

  it("kickoffWallClockMinutesWithOffset переносит через полночь", () => {
    expect(kickoffWallClockMinutesWithOffset(22 * 60, -12 * 60)).toBe(10 * 60);
  });

  it("shouldPollChampionatMatchNow false для LIVE (опрашивает live-воркер)", () => {
    const now = new Date("2026-06-10T18:30:00Z");
    expect(
      shouldPollChampionatMatchNow({
        startsAt: new Date("2026-06-10T18:00:00Z"),
        status: MatchStatus.LIVE,
        championatTrackActive: true,
        now,
      }),
    ).toBe(false);
  });

  it("shouldPollChampionatMatchNow false при неактивном трекинге", () => {
    expect(
      shouldPollChampionatMatchNow({
        startsAt: new Date("2026-06-10T18:00:00Z"),
        status: MatchStatus.LIVE,
        championatTrackActive: false,
        now: new Date(),
      }),
    ).toBe(false);
  });

  it("stale без счёта не опрашивается чаще CHAMPIONAT_STALE_RETRY_MS", () => {
    vi.useFakeTimers();
    const now = new Date("2026-06-10T22:00:00Z");
    const startsAt = new Date("2026-06-10T10:00:00Z");
    const base = {
      startsAt,
      status: MatchStatus.SCHEDULED,
      championatTrackActive: true,
      homeScore: null,
      awayScore: null,
      now,
    };

    expect(shouldPollChampionatMatchNow(base)).toBe(true);

    expect(
      shouldPollChampionatMatchNow({
        ...base,
        championatLastSyncAt: new Date(now.getTime() - CHAMPIONAT_STALE_RETRY_MS + 30_000),
      }),
    ).toBe(false);

    expect(
      shouldPollChampionatMatchNow({
        ...base,
        championatLastSyncAt: new Date(now.getTime() - CHAMPIONAT_STALE_RETRY_MS - 1_000),
      }),
    ).toBe(true);

    vi.useRealTimers();
  });

  it("stale со счётом опрашивается чаще CHAMPIONAT_STALE_WITH_SCORE_RETRY_MS", () => {
    const now = new Date("2026-06-10T22:00:00Z");
    const startsAt = new Date("2026-06-10T10:00:00Z");
    const base = {
      startsAt,
      status: MatchStatus.SCHEDULED,
      championatTrackActive: true,
      homeScore: 1,
      awayScore: 0,
      now,
    };

    expect(
      shouldPollChampionatMatchNow({
        ...base,
        championatLastSyncAt: new Date(now.getTime() - CHAMPIONAT_STALE_WITH_SCORE_RETRY_MS + 5_000),
      }),
    ).toBe(false);

    expect(
      shouldPollChampionatMatchNow({
        ...base,
        championatLastSyncAt: new Date(now.getTime() - CHAMPIONAT_STALE_WITH_SCORE_RETRY_MS - 1_000),
      }),
    ).toBe(true);
  });
});
