import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import type { PredictionMatchItem } from "@/lib/predictions-list";
import {
  isFinishedPredictionItem,
  partitionAllPredictionItems,
  predictionMatchFinishedSortAt,
  sortFinishedPredictionItems,
} from "@/lib/predictions-list";

function item(
  partial: Partial<PredictionMatchItem["match"]> & {
    inProgress?: boolean;
    postponed?: boolean;
    staleAwaitingResult?: boolean;
  },
): PredictionMatchItem {
  return {
    match: {
      id: partial.id ?? "m1",
      startsAt: partial.startsAt ?? new Date("2026-04-15T20:00:00Z"),
      status: partial.status ?? MatchStatus.SCHEDULED,
      stage: "Тур",
      venueName: null,
      venueCity: null,
      homeScore: null,
      awayScore: null,
      championatFinishedAt: partial.championatFinishedAt ?? null,
      homeTeam: { name: "A", shortName: "A" },
      awayTeam: { name: "B", shortName: "B" },
    },
    canPredict: true,
    prediction: null,
    locked: false,
    postponed: partial.postponed ?? false,
    inProgress: partial.inProgress ?? false,
    staleAwaitingResult: partial.staleAwaitingResult ?? false,
    points: 0,
    scoreReason: null,
  };
}

describe("predictions list sorting", () => {
  it("сортирует завершённые по дате матча (новее выше)", () => {
    const sorted = sortFinishedPredictionItems([
      item({ id: "jan", startsAt: new Date("2026-01-19T00:00:00Z"), status: MatchStatus.FINISHED }),
      item({ id: "apr8", startsAt: new Date("2026-04-08T00:00:00Z"), status: MatchStatus.FINISHED }),
      item({ id: "apr15", startsAt: new Date("2026-04-15T00:00:00Z"), status: MatchStatus.FINISHED }),
    ]);
    expect(sorted.map((i) => i.match.id)).toEqual(["apr15", "apr8", "jan"]);
  });

  it("использует championatFinishedAt при наличии", () => {
    const a = item({
      id: "a",
      status: MatchStatus.FINISHED,
      startsAt: new Date("2026-01-01T00:00:00Z"),
      championatFinishedAt: new Date("2026-06-01T00:00:00Z"),
    });
    const b = item({
      id: "b",
      status: MatchStatus.FINISHED,
      startsAt: new Date("2026-05-01T00:00:00Z"),
    });
    expect(predictionMatchFinishedSortAt(a)).toBeGreaterThan(
      predictionMatchFinishedSortAt(b),
    );
  });

  it("разделяет вкладку «Все»", () => {
    const part = partitionAllPredictionItems([
      item({ id: "live", inProgress: true }),
      item({ id: "up", startsAt: new Date("2026-12-01T00:00:00Z") }),
      item({ id: "fin", status: MatchStatus.FINISHED }),
      item({ id: "post", postponed: true, status: MatchStatus.POSTPONED }),
    ]);
    expect(part.inProgress.map((i) => i.match.id)).toEqual(["live"]);
    expect(part.upcoming.map((i) => i.match.id)).toEqual(["up"]);
    expect(part.finished.map((i) => i.match.id)).toEqual(["fin"]);
    expect(part.postponed.map((i) => i.match.id)).toEqual(["post"]);
  });

  it("определяет завершённый через stale", () => {
    expect(
      isFinishedPredictionItem(
        item({ status: MatchStatus.LIVE, staleAwaitingResult: true }),
      ),
    ).toBe(true);
  });
});
