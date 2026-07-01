import { describe, expect, it } from "vitest";
import {
  buildPointsHistoryEntries,
  resolveChampionAwardedAt,
} from "@/lib/leaderboard/points-history";

describe("buildPointsHistoryEntries", () => {
  it("показывает серию пенальти в результате", () => {
    const entries = buildPointsHistoryEntries({
      predictions: [
        {
          id: "p1",
          homeScore: 1,
          awayScore: 2,
          scores: [
            {
              id: "s1",
              points: 6,
              reason: "Точный счёт",
              calculatedAt: new Date("2026-06-30T12:00:00Z"),
            },
          ],
          match: {
            stage: "1/16 финала",
            startsAt: new Date("2026-06-29T20:30:00Z"),
            homeScore: 1,
            awayScore: 1,
            homePenaltyScore: 3,
            awayPenaltyScore: 4,
            homeTeam: { name: "Германия", countryCode: "DE" },
            awayTeam: { name: "Парагвай", countryCode: "PY" },
          },
        },
      ],
      championPick: null,
      championAwardedAt: null,
      penaltyScoringSynthetic: true,
    });

    expect(entries).toHaveLength(1);
    if (entries[0]?.kind === "match") {
      expect(entries[0].usesSyntheticScore).toBe(true);
      expect(entries[0].scoringHome).toBe(1);
      expect(entries[0].scoringAway).toBe(2);
    }
  });

  it("собирает начисления по матчам и сортирует по дате", () => {
    const entries = buildPointsHistoryEntries({
      predictions: [
        {
          id: "p1",
          homeScore: 1,
          awayScore: 0,
          scores: [
            {
              id: "s1",
              points: 3,
              reason: "Точный счёт",
              calculatedAt: new Date("2026-06-02T12:00:00Z"),
            },
          ],
          match: {
            stage: "Группа A",
            startsAt: new Date("2026-06-01T18:00:00Z"),
            homeScore: 1,
            awayScore: 0,
            homeTeam: { name: "Бразилия", countryCode: "BR" },
            awayTeam: { name: "Сербия", countryCode: "RS" },
          },
        },
        {
          id: "p2",
          homeScore: 2,
          awayScore: 2,
          scores: [
            {
              id: "s2",
              points: 4,
              reason: "Исход и голы",
              calculatedAt: new Date("2026-06-03T12:00:00Z"),
            },
          ],
          match: {
            stage: "Группа B",
            startsAt: new Date("2026-06-02T18:00:00Z"),
            homeScore: 2,
            awayScore: 1,
            homeTeam: { name: "Франция", countryCode: "FR" },
            awayTeam: { name: "Германия", countryCode: "DE" },
          },
        },
      ],
      championPick: null,
      championAwardedAt: null,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("s2");
    expect(entries[1]?.kind).toBe("match");
    if (entries[1]?.kind === "match") {
      expect(entries[1].predictedHome).toBe(1);
    }
  });

  it("добавляет ставку на чемпиона", () => {
    const entries = buildPointsHistoryEntries({
      predictions: [],
      championPick: {
        id: "bp1",
        points: 10,
        team: { name: "Аргентина", countryCode: "AR" },
      },
      championAwardedAt: new Date("2026-07-20T20:00:00Z"),
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: "champion",
      points: 10,
      teamName: "Аргентина",
    });
  });

  it("не дублирует начисление при нескольких PredictionScore", () => {
    const entries = buildPointsHistoryEntries({
      predictions: [
        {
          id: "p1",
          homeScore: 2,
          awayScore: 1,
          scores: [
            {
              id: "s-old",
              points: 1,
              reason: "Голы одной команды",
              calculatedAt: new Date("2026-06-14T13:00:00Z"),
            },
            {
              id: "s-new",
              points: 1,
              reason: "Голы одной команды",
              calculatedAt: new Date("2026-06-14T16:11:00Z"),
            },
          ],
          match: {
            stage: "Группа C",
            startsAt: new Date("2026-06-14T01:00:00Z"),
            homeScore: 1,
            awayScore: 1,
            homeTeam: { name: "Бразилия", countryCode: "BR" },
            awayTeam: { name: "Марокко", countryCode: "MA" },
          },
        },
      ],
      championPick: null,
      championAwardedAt: null,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.points).toBe(1);
  });

  it("сортирует по времени матча, а не по calculatedAt пересчёта", () => {
    const entries = buildPointsHistoryEntries({
      predictions: [
        {
          id: "p-old",
          homeScore: 1,
          awayScore: 0,
          scores: [
            {
              id: "s-old",
              points: 3,
              reason: "Точный счёт",
              calculatedAt: new Date("2026-06-20T12:00:00Z"),
            },
          ],
          match: {
            stage: "Группа A",
            startsAt: new Date("2026-06-10T18:00:00Z"),
            championatFinishedAt: new Date("2026-06-10T20:00:00Z"),
            homeScore: 1,
            awayScore: 0,
            homeTeam: { name: "A", countryCode: null },
            awayTeam: { name: "B", countryCode: null },
          },
        },
        {
          id: "p-new",
          homeScore: 2,
          awayScore: 1,
          scores: [
            {
              id: "s-new",
              points: 3,
              reason: "Точный счёт",
              calculatedAt: new Date("2026-06-11T00:00:00Z"),
            },
          ],
          match: {
            stage: "Группа B",
            startsAt: new Date("2026-06-15T18:00:00Z"),
            championatFinishedAt: null,
            homeScore: 2,
            awayScore: 1,
            homeTeam: { name: "C", countryCode: null },
            awayTeam: { name: "D", countryCode: null },
          },
        },
      ],
      championPick: null,
      championAwardedAt: null,
    });

    expect(entries.map((e) => e.id)).toEqual(["s-new", "s-old"]);
  });

  it("пропускает нулевые начисления", () => {
    const entries = buildPointsHistoryEntries({
      predictions: [
        {
          id: "p1",
          homeScore: 0,
          awayScore: 3,
          scores: [
            {
              id: "s0",
              points: 0,
              reason: "Матч не завершён",
              calculatedAt: new Date(),
            },
          ],
          match: {
            stage: null,
            startsAt: new Date(),
            homeScore: 0,
            awayScore: 3,
            homeTeam: { name: "A", countryCode: null },
            awayTeam: { name: "B", countryCode: null },
          },
        },
      ],
      championPick: null,
      championAwardedAt: null,
    });

    expect(entries).toHaveLength(0);
  });

  it("дата ставки на чемпиона — только из финала, не из 1/8", () => {
    const awardedAt = resolveChampionAwardedAt([
      {
        stage: "1/8 финала",
        startsAt: new Date("2026-07-01T01:00:00Z"),
        championatFinishedAt: new Date("2026-07-01T01:54:00Z"),
      },
      {
        stage: "Финал",
        startsAt: new Date("2026-07-20T20:00:00Z"),
        championatFinishedAt: new Date("2026-07-20T22:30:00Z"),
      },
    ]);

    expect(awardedAt).toEqual(new Date("2026-07-20T22:30:00Z"));
  });

  it("без финала дата ставки на чемпиона не определена", () => {
    expect(
      resolveChampionAwardedAt([
        {
          stage: "1/16 финала",
          startsAt: new Date("2026-06-30T20:00:00Z"),
          championatFinishedAt: new Date("2026-06-30T22:00:00Z"),
        },
      ]),
    ).toBeNull();
  });
});
