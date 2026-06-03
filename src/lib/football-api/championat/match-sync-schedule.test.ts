import { describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import {
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

  it("shouldPollChampionatMatchNow true для LIVE", () => {
    const now = new Date("2026-06-10T18:30:00Z");
    expect(
      shouldPollChampionatMatchNow({
        startsAt: new Date("2026-06-10T18:00:00Z"),
        status: MatchStatus.LIVE,
        championatTrackActive: true,
        now,
      }),
    ).toBe(true);
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
});
