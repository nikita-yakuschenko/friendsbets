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
    const body = buildNightBatchInAppBody({ matches });
    expect(body).toContain(
      "Ты не сделал прогноз на предстоящие матчи, не забудь это сделать",
    );
    expect(body).toContain("Россия");
    expect(body).toContain("Франция");
    expect(body).toContain("матч начнётся");
  });

  it("telegram содержит CTA-ссылку на прогнозы", () => {
    const html = buildNightBatchTelegramPersonalHtml({
      matches,
      inviteCode: "ABC123",
      origin: "https://friendsbets.ru",
    });
    expect(html).toContain("Ты не сделал прогноз на предстоящие матчи");
    expect(html).toContain("начнётся");
    expect(html).toContain("до начала");
    expect(html).toContain('href="https://friendsbets.ru/game/ABC123/predictions"');
  });
});
