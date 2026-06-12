import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { CHAMPIONAT_LIVE_DATA_STALE_MS } from "@/lib/football-api/championat/championat-live-constants";
import { isChampionatLiveViewStale } from "@/lib/football-api/championat/load-championat-match-live-view";

describe("isChampionatLiveViewStale", () => {
  it("false для завершённого матча вне окна пост-финиша", () => {
    const now = new Date("2026-06-13T12:00:00Z");
    expect(
      isChampionatLiveViewStale(
        {
          status: MatchStatus.FINISHED,
          startsAt: new Date("2026-06-12T18:00:00Z"),
          championatFinishedAt: new Date("2026-06-12T21:00:00Z"),
        },
        new Date("2026-06-12T21:30:00Z"),
        now,
      ),
    ).toBe(false);
  });

  it("true для live без синка", () => {
    const now = new Date("2026-06-12T20:00:00Z");
    expect(
      isChampionatLiveViewStale(
        {
          status: MatchStatus.LIVE,
          startsAt: new Date("2026-06-12T18:00:00Z"),
        },
        null,
        now,
      ),
    ).toBe(true);
  });

  it("true если синк старше порога", () => {
    const now = new Date("2026-06-12T20:00:00Z");
    expect(
      isChampionatLiveViewStale(
        {
          status: MatchStatus.LIVE,
          startsAt: new Date("2026-06-12T18:00:00Z"),
        },
        new Date(now.getTime() - CHAMPIONAT_LIVE_DATA_STALE_MS - 1_000),
        now,
      ),
    ).toBe(true);
  });
});
