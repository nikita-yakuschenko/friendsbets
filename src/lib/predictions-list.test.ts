import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import type { PredictionMatchItem } from "@/lib/predictions-list";
import {
  buildPredictionStageGroups,
  isFinishedPredictionItem,
  partitionAllPredictionItems,
  predictionMatchFinishedSortAt,
  sortFinishedPredictionItems,
  sortUpcomingPredictionsBySchedule,
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
      stage: partial.stage ?? "Тур",
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

  it("сортирует предстоящие строго по расписанию", () => {
    const sorted = sortUpcomingPredictionsBySchedule([
      item({
        id: "aus-tur",
        stage: "Группа D - Тур 1",
        startsAt: new Date("2026-06-14T04:00:00Z"),
      }),
      item({
        id: "usa-par",
        stage: "Группа D - Тур 1",
        startsAt: new Date("2026-06-13T01:00:00Z"),
      }),
      item({
        id: "qat-che",
        stage: "Группа B - Тур 1",
        startsAt: new Date("2026-06-13T19:00:00Z"),
      }),
      item({
        id: "bra-mar",
        stage: "Группа C - Тур 1",
        startsAt: new Date("2026-06-13T22:00:00Z"),
      }),
    ]);

    expect(sorted.map((i) => i.match.id)).toEqual([
      "usa-par",
      "qat-che",
      "bra-mar",
      "aus-tur",
    ]);
  });

  it("группирует предстоящие по хронологии, а не целиком по туру", () => {
    const groups = buildPredictionStageGroups(
      [
        item({
          id: "d-late",
          stage: "Группа D - Тур 1",
          startsAt: new Date("2026-06-14T04:00:00Z"),
        }),
        item({
          id: "d-early",
          stage: "Группа D - Тур 1",
          startsAt: new Date("2026-06-13T01:00:00Z"),
        }),
        item({
          id: "b-mid",
          stage: "Группа B - Тур 1",
          startsAt: new Date("2026-06-13T19:00:00Z"),
        }),
      ],
      "upcoming",
    );

    expect(groups.flatMap((g) => g.items.map((i) => i.match.id))).toEqual([
      "d-early",
      "b-mid",
      "d-late",
    ]);
  });

  it("определяет завершённый через stale", () => {
    expect(
      isFinishedPredictionItem(
        item({ status: MatchStatus.LIVE, staleAwaitingResult: true }),
      ),
    ).toBe(true);
  });
});
