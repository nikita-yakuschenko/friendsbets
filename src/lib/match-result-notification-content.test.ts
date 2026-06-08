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

  it("in-app содержит результат, очки, место и следующий матч", () => {
    const body = buildMatchResultInAppBody(base);
    expect(body).toContain("Матч завершён");
    expect(body).toContain("Счёт: 2:1");
    expect(body).toContain("Заработано: 1 очко");
    expect(body).toContain("3 месте из 12");
    expect(body).toContain("Следующий матч");
    expect(body).toContain("Не забудьте сделать прогноз");
  });

  it("telegram содержит ссылку на прогнозы", () => {
    const html = buildMatchResultTelegramHtml({
      ...base,
      origin: "https://friendsbets.ru",
    });
    expect(html).toContain("Матч завершён");
    expect(html).toContain('href="https://friendsbets.ru/game/TEST01/predictions"');
  });
});
