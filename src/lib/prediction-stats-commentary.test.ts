import { describe, expect, it } from "vitest";
import { buildPredictionStatsCommentary } from "@/lib/prediction-stats-commentary";
import type { LivePredictionStats } from "@/lib/live-match-stats";

const home = { name: "Португалия", countryCode: "PT" };
const away = { name: "Нигерия", countryCode: "NG" };

function baseStats(overrides: Partial<LivePredictionStats>): LivePredictionStats {
  return {
    total: 2,
    mostCommonScore: "3:0",
    mostCommonCount: 2,
    homeWin: 2,
    draw: 0,
    awayWin: 0,
    exactAtCurrentScore: null,
    ...overrides,
  };
}

describe("prediction stats commentary", () => {
  it("lone warrior — один за хозяев, остальные за гостей", () => {
    const text = buildPredictionStatsCommentary({
      seed: "match-1",
      homeTeam: home,
      awayTeam: away,
      stats: baseStats({
        total: 3,
        homeWin: 1,
        awayWin: 2,
        mostCommonScore: "0:2",
        mostCommonCount: 2,
      }),
      predictions: [
        { displayName: "Никита", homeScore: 3, awayScore: 0 },
        { displayName: "Петя", homeScore: 0, awayScore: 2 },
        { displayName: "Вася", homeScore: 1, awayScore: 2 },
      ],
    });
    expect(text).toMatch(/Один в поле воин|Один голос за|Один против толпы/i);
    expect(text).toContain("Никита");
    expect(text).toContain("Португалию");
  });

  it("split — равное число за П1 и П2", () => {
    const text = buildPredictionStatsCommentary({
      seed: "match-2",
      homeTeam: home,
      awayTeam: away,
      stats: baseStats({
        total: 4,
        homeWin: 2,
        awayWin: 2,
        draw: 0,
        mostCommonScore: null,
        mostCommonCount: 1,
      }),
      predictions: [
        { displayName: "А", homeScore: 2, awayScore: 0 },
        { displayName: "Б", homeScore: 1, awayScore: 0 },
        { displayName: "В", homeScore: 0, awayScore: 1 },
        { displayName: "Г", homeScore: 0, awayScore: 2 },
      ],
    });
    expect(text).toMatch(/Мнения разделились|Почти поровну|Спор до хрипоты|Лагеря сформировались/);
  });

  it("draw heavy — много ничьих", () => {
    const text = buildPredictionStatsCommentary({
      seed: "match-3",
      homeTeam: home,
      awayTeam: away,
      stats: baseStats({
        total: 5,
        homeWin: 1,
        awayWin: 1,
        draw: 3,
        mostCommonScore: "0:0",
        mostCommonCount: 3,
      }),
      predictions: [
        { displayName: "А", homeScore: 0, awayScore: 0 },
        { displayName: "Б", homeScore: 0, awayScore: 0 },
        { displayName: "В", homeScore: 0, awayScore: 0 },
        { displayName: "Г", homeScore: 1, awayScore: 0 },
        { displayName: "Д", homeScore: 0, awayScore: 1 },
      ],
    });
    expect(text).toMatch(/ничью|ничьих|иксов/i);
  });

  it("unanimous home — склонение «за Португалию»", () => {
    const text = buildPredictionStatsCommentary({
      seed: "match-4",
      homeTeam: home,
      awayTeam: away,
      stats: baseStats({
        total: 2,
        homeWin: 2,
        awayWin: 0,
        mostCommonScore: "2:0",
        mostCommonCount: 1,
      }),
      predictions: [
        { displayName: "А", homeScore: 3, awayScore: 0 },
        { displayName: "Б", homeScore: 2, awayScore: 0 },
      ],
    });
    expect(text).toMatch(/за .*Португалию|победа Португалии/i);
    expect(text).not.toMatch(/за .*Португалия[^ю]/i);
  });

  it("unanimous score — коллективное чутьё", () => {
    const text = buildPredictionStatsCommentary({
      seed: "match-score",
      homeTeam: home,
      awayTeam: away,
      stats: baseStats({
        total: 2,
        homeWin: 2,
        awayWin: 0,
        mostCommonScore: "3:0",
        mostCommonCount: 2,
      }),
      predictions: [
        { displayName: "А", homeScore: 3, awayScore: 0 },
        { displayName: "Б", homeScore: 3, awayScore: 0 },
      ],
    });
    expect(text).toMatch(/фантазии|коллективн/i);
  });

  it("стабильный выбор шутки по seed", () => {
    const input = {
      seed: "stable-id",
      homeTeam: home,
      awayTeam: away,
      stats: baseStats({ total: 2, homeWin: 2, awayWin: 0 }),
      predictions: [
        { displayName: "А", homeScore: 1, awayScore: 0 },
        { displayName: "Б", homeScore: 2, awayScore: 0 },
      ],
    };
    expect(buildPredictionStatsCommentary(input)).toBe(
      buildPredictionStatsCommentary(input),
    );
  });
});
