import { describe, expect, it } from "vitest";
import {
  buildMissingPredictionCopyText,
  buildMissingPredictionInAppBody,
  buildMissingPredictionTelegramPersonalHtml,
  PREDICTION_CTA_LABEL,
} from "@/lib/prediction-reminder-content";

const matchTeams = {
  homeTeam: { name: "Мексика", countryCode: "mx" },
  awayTeam: { name: "ЮАР", countryCode: "za" },
  startsAt: new Date("2026-06-11T19:00:00.000Z"),
  inviteCode: "TEST01",
};

describe("prediction reminder content", () => {
  it("in-app: матч и время без URL", () => {
    const text = buildMissingPredictionInAppBody(matchTeams);

    expect(text).toContain("Ты не сделал прогноз на матч");
    expect(text).toContain("Мексика");
    expect(text).toContain("ЮАР");
    expect(text).toContain("МСК");
    expect(text).not.toContain("http");
    expect(text).toContain("FriendsBets 💚");
  });

  it("копирование: подписанная ссылка", () => {
    const text = buildMissingPredictionCopyText({
      ...matchTeams,
      origin: "https://friendsbets.ru",
    });

    expect(text).toContain(`${PREDICTION_CTA_LABEL}:`);
    expect(text).toContain("https://friendsbets.ru/game/TEST01/predictions");
  });

  it("telegram: жирный заголовок, флаги, отступы, CTA и 💚", () => {
    const html = buildMissingPredictionTelegramPersonalHtml({
      ...matchTeams,
      origin: "https://friendsbets.ru",
    });

    expect(html).toContain("Ты не сделал прогноз на матч");
    expect(html).toContain("Мексика");
    expect(html).toContain("ЮАР");
    expect(html).toContain("МСК");
    expect(html).toContain(`<a href="https://friendsbets.ru/game/TEST01/predictions">`);
    expect(html).toContain(PREDICTION_CTA_LABEL);
    expect(html).toContain("FriendsBets 💚");
    expect(html).toContain("начнётся");
    expect(html).toContain("до начала");
    expect(html).toContain('href="https://friendsbets.ru/game/TEST01/predictions"');
  });
});
