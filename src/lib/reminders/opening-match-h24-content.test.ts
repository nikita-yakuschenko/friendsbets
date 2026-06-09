import { describe, expect, it } from "vitest";
import {
  buildOpeningH24InAppBody,
  buildOpeningH24TelegramHtml,
  OPENING_H24_SIGNOFF,
  OPENING_H24_WITHOUT_PREDICTION_TEXT,
  OPENING_H24_WITH_PREDICTION_TEXT,
} from "@/lib/reminders/opening-match-h24-content";

const base = {
  gameTitle: "Друзья 2026",
  inviteCode: "TEST01",
  homeTeam: { name: "Мексика", countryCode: "mx" },
  awayTeam: { name: "ЮАР", countryCode: "za" },
  startsAt: new Date("2026-06-11T19:00:00.000Z"),
};

describe("opening match h24 content", () => {
  it("с прогнозом — напоминание про часовой пояс", () => {
    const text = buildOpeningH24InAppBody({ ...base, hasPrediction: true });
    expect(text).toContain("24 часа");
    expect(text).toContain(OPENING_H24_WITH_PREDICTION_TEXT);
    expect(text).toContain(OPENING_H24_SIGNOFF);
    expect(text).not.toContain(OPENING_H24_WITHOUT_PREDICTION_TEXT);
  });

  it("без прогноза — предупреждение про очки на старте", () => {
    const text = buildOpeningH24InAppBody({ ...base, hasPrediction: false });
    expect(text).toContain(OPENING_H24_WITHOUT_PREDICTION_TEXT);
    expect(text).toContain("Матч открытия");
  });

  it("telegram без прогноза содержит ссылку", () => {
    const html = buildOpeningH24TelegramHtml({
      ...base,
      hasPrediction: false,
      origin: "https://friendsbets.ru",
    });
    expect(html).toContain("Сделать прогноз");
    expect(html).toContain(OPENING_H24_SIGNOFF);
  });

  it("telegram с прогнозом без ссылки на прогнозы", () => {
    const html = buildOpeningH24TelegramHtml({
      ...base,
      hasPrediction: true,
      origin: "https://friendsbets.ru",
    });
    expect(html).not.toContain("Сделать прогноз");
    expect(html).toContain(OPENING_H24_WITH_PREDICTION_TEXT);
  });
});
