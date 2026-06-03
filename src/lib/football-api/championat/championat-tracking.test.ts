import { describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import {
  championatFinishedTrackingPatch,
  isChampionatPostFinishPollPhase,
  shouldDeactivateChampionatTracking,
} from "@/lib/football-api/championat/championat-tracking";

describe("championat tracking", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("включает пост-finish опрос 10 минут", () => {
    const finishedAt = new Date(now.getTime() - 5 * 60_000);
    expect(
      isChampionatPostFinishPollPhase(MatchStatus.FINISHED, finishedAt, now),
    ).toBe(true);
  });

  it("отключает трекинг после 10 минут", () => {
    const finishedAt = new Date(now.getTime() - 11 * 60_000);
    expect(
      shouldDeactivateChampionatTracking(MatchStatus.FINISHED, finishedAt, now),
    ).toBe(true);
  });

  it("ставит finishedAt при переходе в FINISHED", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const patch = championatFinishedTrackingPatch(
      MatchStatus.LIVE,
      MatchStatus.FINISHED,
      null,
      now,
    );
    expect(patch.championatFinishedAt).toBeDefined();
    expect(patch.championatTrackActive).toBe(true);
    vi.useRealTimers();
  });
});
