import { describe, expect, it } from "vitest";
import {
  buildTelegramNotificationHtml,
  formatPointsAccruedLabel,
  formatRankLine,
} from "@/lib/telegram/notification-layout";
import { NOTIFICATION_SIGNOFF } from "@/lib/notification-signoff";
import { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";

const teams = {
  homeTeam: { name: "Испания", countryCode: "ES" },
  awayTeam: { name: "Ирак", countryCode: "IQ" },
};

describe("telegram notification layout", () => {
  it("матч завершён — 15-строчный шаблон", () => {
    const html = buildTelegramNotificationHtml({
      eventLine: "Матч завершён:",
      eventBold: true,
      teams,
      detailLine: "Счёт: 1:1",
      stats: {
        pointsLine: formatPointsAccruedLabel(0),
        rankLine: formatRankLine(1, 0),
      },
      schedule: {
        headerLine: "Следующий матч: Франция 🇫🇷 - 🇨🇮 Кот-д'Ивуар",
        startsAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
      },
      inviteCode: "TEST01",
      origin: "https://friendsbets.ru",
    });

    const lines = html.split("\n");
    expect(lines[0]).toContain("Матч завершён:");
    expect(lines[1]).toContain("Испания");
    expect(lines[2]).toBe("Счёт: 1:1");
    expect(lines[3]).toBe("");
    expect(lines[4]).toBe(formatPointsAccruedLabel(0));
    expect(lines[5]).toBe(formatRankLine(1, 0));
    expect(lines[6]).toBe("");
    expect(lines[7]).toContain("Следующий матч:");
    expect(lines[8]).toContain("начнётся");
    expect(lines[9]).toMatch(/^до начала /);
    expect(lines[10]).toBe("");
    expect(lines[11]).toContain(PREDICTION_CTA_LABEL);
    expect(lines[12]).toBe("");
    expect(lines[13]).toBe(NOTIFICATION_SIGNOFF);
  });

  it("матч начался — строка 3 с прогнозом", () => {
    const html = buildTelegramNotificationHtml({
      eventLine: "Матч начался:",
      eventBold: true,
      teams,
      detailLine: "Прогноз: 2:0",
      inviteCode: "TEST01",
      origin: "https://friendsbets.ru",
    });

    expect(html).toContain("Матч начался:");
    expect(html).toContain("Прогноз: 2:0");
    expect(html).toContain('href="https://friendsbets.ru/game/TEST01/predictions"');
  });
});
