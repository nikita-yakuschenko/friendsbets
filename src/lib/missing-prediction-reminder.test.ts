import { describe, expect, it } from "vitest";
import {
  buildMissingPredictionCopyText,
  buildMissingPredictionInAppBody,
  buildMissingPredictionTelegramHtml,
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

  it("telegram: маскированная HTML-ссылка", () => {
    const html = buildMissingPredictionTelegramHtml({
      displayName: "Иван",
      homeTeam: "Мексика",
      awayTeam: "ЮАР",
      gameTitle: "ЧМ-2026",
      startsAt: matchTeams.startsAt,
      timeLabel: "3 ч",
      inviteCode: "TEST01",
      origin: "https://friendsbets.ru",
    });

    expect(html).toContain(`<a href="https://friendsbets.ru/game/TEST01/predictions">`);
    expect(html).toContain(PREDICTION_CTA_LABEL);
    expect(html).not.toMatch(/>\s*https:\/\//);
  });
});
