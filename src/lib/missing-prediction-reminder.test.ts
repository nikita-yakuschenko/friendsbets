import { describe, expect, it } from "vitest";
import { buildMissingPredictionReminderText } from "@/lib/missing-prediction-reminder";

describe("buildMissingPredictionReminderText", () => {
  it("содержит матч, МСК и ссылку на прогнозы", () => {
    const text = buildMissingPredictionReminderText({
      homeTeam: { name: "Мексика", countryCode: "mx" },
      awayTeam: { name: "ЮАР", countryCode: "za" },
      startsAt: new Date("2026-06-11T19:00:00.000Z"),
      inviteCode: "TEST01",
      origin: "https://friendsbets.ru",
    });

    expect(text).toContain("Ты не сделал прогноз на матч");
    expect(text).toContain("Мексика");
    expect(text).toContain("ЮАР");
    expect(text).toContain("МСК");
    expect(text).toContain("https://friendsbets.ru/game/TEST01/predictions");
    expect(text).toContain("FriendsBets 💚");
  });
});
