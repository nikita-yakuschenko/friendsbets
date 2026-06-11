import { describe, expect, it } from "vitest";
import { buildPointsHistoryEntries } from "@/lib/leaderboard/points-history";

describe("buildPointsHistoryEntries", () => {
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
});
