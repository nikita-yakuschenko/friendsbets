import { describe, expect, it } from "vitest";
import {
  buildOpeningMatchInAppBody,
  buildOpeningMatchTelegramPersonalHtml,
} from "@/lib/prediction-reminder-content";

describe("opening match welcome reminder", () => {
  it("in-app содержит приветствие и матч открытия", () => {
    const text = buildOpeningMatchInAppBody({
      gameTitle: "Авангард 2026",
      homeTeam: { name: "Мексика", countryCode: "mx" },
      awayTeam: { name: "ЮАР", countryCode: "za" },
      startsAt: new Date("2026-06-11T19:00:00.000Z"),
    });

    expect(text).toContain("Добро пожаловать");
    expect(text).toContain("Авангард 2026");
    expect(text).toContain("матч открытия");
    expect(text).toContain("Мексика");
    expect(text).toContain("МСК");
  });

  it("telegram html содержит ссылку на прогнозы", () => {
    const html = buildOpeningMatchTelegramPersonalHtml({
      gameTitle: "Авангард 2026",
      homeTeam: { name: "Мексика", countryCode: "mx" },
      awayTeam: { name: "ЮАР", countryCode: "za" },
      startsAt: new Date("2026-06-11T19:00:00.000Z"),
      inviteCode: "TEST01",
      origin: "https://friendsbets.ru",
    });

    expect(html).toContain("Добро пожаловать");
    expect(html).toContain("https://friendsbets.ru/game/TEST01/predictions");
    expect(html).toContain("Сделать прогноз");
  });
});
