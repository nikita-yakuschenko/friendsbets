import { describe, expect, it } from "vitest";
import {
  buildMatchResultInAppBody,
  buildMatchResultTelegramHtml,
  formatPointsLabel,
} from "@/lib/match-result-notification-content";

const base = {
  homeTeam: { name: "Россия", countryCode: "RU" },
  awayTeam: { name: "Германия", countryCode: "DE" },
  homeScore: 2,
  awayScore: 1,
  gameTitle: "ЧМ 2026",
  inviteCode: "TEST01",
  predictedHome: 1,
  predictedAway: 0,
  matchPoints: 1,
  matchPointsReason: "Угадан исход",
  rank: 3,
  participantsCount: 12,
  totalPoints: 15,
  nextMatch: {
    homeTeam: { name: "Франция", countryCode: "FR" },
    awayTeam: { name: "Испания", countryCode: "ES" },
    startsAt: new Date("2026-06-15T16:00:00.000Z"),
    hasPrediction: false,
  },
};

describe("match result notification content", () => {
  it("склоняет очки", () => {
    expect(formatPointsLabel(1)).toBe("1 очко");
    expect(formatPointsLabel(2)).toBe("2 очка");
    expect(formatPointsLabel(5)).toBe("5 очков");
  });

  it("in-app содержит серию пенальти", () => {
    const body = buildMatchResultInAppBody({
      ...base,
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 3,
      awayPenaltyScore: 4,
      homeTeam: { name: "Германия", countryCode: "DE" },
      awayTeam: { name: "Парагвай", countryCode: "PY" },
    });
    expect(body).toContain("Счёт: 1:1 (пен. 3:4)");
    expect(body).toContain("Исход по пенальти: Парагвай (3:4)");
  });

  it("in-app содержит синтетический счёт для очков", () => {
    const body = buildMatchResultInAppBody({
      ...base,
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 3,
      awayPenaltyScore: 4,
      scoringHome: 1,
      scoringAway: 2,
      homeTeam: { name: "Германия", countryCode: "DE" },
      awayTeam: { name: "Парагвай", countryCode: "PY" },
    });
    expect(body).toContain("Для очков: 1 : 2");
  });

  it("telegram содержит синтетический счёт для очков", () => {
    const html = buildMatchResultTelegramHtml({
      ...base,
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 2,
      awayPenaltyScore: 3,
      scoringHome: 1,
      scoringAway: 2,
      homeTeam: { name: "Нидерланды", countryCode: "NL" },
      awayTeam: { name: "Марокко", countryCode: "MA" },
      nextMatch: null,
      origin: "https://friendsbets.ru",
    });
    expect(html).toContain("Для очков: 1 : 2");
  });

  it("in-app содержит результат, очки, место и следующий матч", () => {
    const body = buildMatchResultInAppBody(base);
    expect(body).toContain("В турнире «ЧМ 2026»");
    expect(body).toContain("Матч завершён");
    expect(body).toContain("Счёт: 2:1");
    expect(body).toContain("Заработано: 1 очко");
    expect(body).toContain("3 месте из 12");
    expect(body).toContain("Следующий матч");
    expect(body).toContain("Не забудьте сделать прогноз");
  });

  it("telegram выводит названия команд без букв кодов стран", () => {
    const html = buildMatchResultTelegramHtml({
      ...base,
      homeTeam: { name: "Канада", countryCode: "CA" },
      awayTeam: { name: "Босния и Герцеговина", countryCode: "BA" },
      nextMatch: {
        homeTeam: { name: "Катар", countryCode: "QA" },
        awayTeam: { name: "Швейцария", countryCode: "CH" },
        startsAt: new Date("2026-06-13T19:00:00.000Z"),
        hasPrediction: false,
      },
      origin: "https://friendsbets.ru",
    });
    expect(html).toContain("Канада — Босния и Герцеговина");
    expect(html).toContain("Катар — Швейцария");
    expect(html).not.toMatch(/\bca\b/i);
    expect(html).not.toMatch(/\bqa\b/i);
  });

  it("telegram содержит ссылку на прогнозы", () => {
    const html = buildMatchResultTelegramHtml({
      ...base,
      origin: "https://friendsbets.ru",
    });
    expect(html).toContain("В турнире «ЧМ 2026»");
    expect(html).toContain("Матч завершён:");
    expect(html).toContain("Начислено");
    expect(html).toContain("Ты на");
    expect(html).toContain('href="https://friendsbets.ru/game/TEST01/predictions"');
  });
});
