import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseChampionatMatchProtocolHtml } from "@/lib/football-api/championat/match-protocol";
import { parseChampionatMatchLiveSnapshot } from "@/lib/football-api/championat/match-live-snapshot";

const liveFixture = readFileSync(
  join(process.cwd(), "tests/fixtures/championat-match-live-mexico.html"),
  "utf8",
);

const canadaFixture = readFileSync(
  join(process.cwd(), "tests/fixtures/championat-match-live-canada.html"),
  "utf8",
);

describe("parseChampionatMatchProtocolHtml", () => {
  it("парсит голы и карточки с лайв-страницы Мексика — ЮАР", () => {
    const events = parseChampionatMatchProtocolHtml(liveFixture);

    const goals = events.filter((e) => e.type === "GOAL");
    expect(goals.length).toBeGreaterThanOrEqual(2);
    expect(goals.some((e) => e.playerName.includes("Киньонес"))).toBe(true);
    expect(goals.some((e) => e.playerName.includes("Хименес"))).toBe(true);

    const cards = events.filter(
      (e) => e.type === "YELLOW_CARD" || e.type === "RED_CARD",
    );
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("live snapshot: счёт 2:0 и фаза finished/ live", () => {
    const snap = parseChampionatMatchLiveSnapshot(liveFixture);
    expect(snap.homeScore).toBe(2);
    expect(snap.awayScore).toBe(0);
    expect(snap.events.length).toBeGreaterThanOrEqual(2);
  });

  it("не склеивает две жёлтые в одной точке таймлайна (Канада — Босния)", () => {
    const events = parseChampionatMatchProtocolHtml(canadaFixture);
    const yellowCards = events.filter((e) => e.type === "YELLOW_CARD");

    expect(
      yellowCards.some(
        (e) =>
          e.playerName.includes("Демирович") &&
          e.playerName.includes("Лукич"),
      ),
    ).toBe(false);

    const demirovic = yellowCards.filter((e) =>
      e.playerName.includes("Демирович"),
    );
    const lukic = yellowCards.filter((e) =>
      e.playerName.includes("Лукич") && e.type === "YELLOW_CARD",
    );

    expect(demirovic).toHaveLength(1);
    expect(demirovic[0]?.minuteLabel).toBe("45'");
    expect(lukic).toHaveLength(1);
    expect(lukic[0]?.minuteLabel).toBe("45+1'");
  });
});
