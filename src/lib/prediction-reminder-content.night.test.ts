import { describe, expect, it } from "vitest";
import {
  buildNightBatchInAppBody,
  buildNightBatchTelegramPersonalHtml,
} from "@/lib/prediction-reminder-content";

describe("night batch reminder content", () => {
  const matches = [
    {
      homeTeam: { name: "Россия", countryCode: "RU" },
      awayTeam: { name: "Германия", countryCode: "DE" },
      startsAt: new Date("2026-06-11T23:00:00.000Z"),
    },
    {
      homeTeam: { name: "Франция", countryCode: "FR" },
      awayTeam: { name: "Испания", countryCode: "ES" },
      startsAt: new Date("2026-06-12T03:00:00.000Z"),
    },
  ];

  it("in-app содержит общую фразу и блоки по матчам", () => {
    const body = buildNightBatchInAppBody({
      gameTitle: "Ночной турнир",
      matches,
    });
    expect(body).toContain("В турнире «Ночной турнир»");
    expect(body).toContain(
      "Ты не сделал прогноз на предстоящие матчи, не забудь это сделать",
    );
    expect(body).toContain("Россия");
    expect(body).toContain("Франция");
    expect(body).toContain("матч начнётся");
  });

  it("telegram содержит CTA-ссылку на прогнозы", () => {
    const html = buildNightBatchTelegramPersonalHtml({
      gameTitle: "Ночной турнир",
      matches,
      inviteCode: "ABC123",
      origin: "https://friendsbets.ru",
    });
    expect(html).toContain("В турнире «Ночной турнир»");
    expect(html).toContain("Ты не сделал прогноз на предстоящие матчи");
    expect(html).toContain("начнётся");
    expect(html).toContain("до начала");
    expect(html).toContain('href="https://friendsbets.ru/game/ABC123/predictions"');
  });
});
