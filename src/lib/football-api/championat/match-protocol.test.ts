import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseChampionatMatchProtocolHtml } from "@/lib/football-api/championat/match-protocol";
import { sortChampionatMatchEventsByMinute } from "@/lib/football-api/championat/match-minute-sort";
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
    expect(cards.every((e) => Boolean(e.assistName))).toBe(true);
    expect(cards.some((e) => e.assistName === "Красная карточка")).toBe(true);
  });

  it("live snapshot: счёт 2:0 и фаза finished/ live", () => {
    const snap = parseChampionatMatchLiveSnapshot(liveFixture);
    expect(snap.homeScore).toBe(2);
    expect(snap.awayScore).toBe(0);
    expect(snap.events.length).toBeGreaterThanOrEqual(2);
  });

  it("берёт события только из протокола (Канада — Босния)", () => {
    const events = parseChampionatMatchProtocolHtml(canadaFixture);

    expect(events.every((e) => e.id.startsWith("proto-"))).toBe(true);
    expect(events.some((e) => e.id.startsWith("tl-"))).toBe(false);

    const goals = events.filter((e) => e.section === "goals");
    expect(goals).toHaveLength(1);
    expect(goals[0]?.playerName).toContain("Лукич");
    expect(goals[0]?.assistName).toContain("Колашинац");
    expect(goals[0]?.score).toBe("0:1");

    const yellowCards = events.filter((e) => e.type === "YELLOW_CARD");
    expect(yellowCards).toHaveLength(3);

    const demirovic = yellowCards.filter((e) =>
      e.playerName.includes("Демирович"),
    );
    const lukic = yellowCards.filter(
      (e) => e.playerName.includes("Лукич") && e.type === "YELLOW_CARD",
    );

    expect(demirovic).toHaveLength(1);
    expect(demirovic[0]?.minuteLabel).toBe("45'");
    expect(demirovic[0]?.assistName).toBe("Жёлтая карточка");
    expect(lukic).toHaveLength(1);
    expect(lukic[0]?.minuteLabel).toBe("45+1'");
    expect(lukic[0]?.assistName).toBe("Жёлтая карточка");

    const cardOrder = sortChampionatMatchEventsByMinute(yellowCards).map(
      (e) => e.minuteLabel,
    );
    expect(cardOrder).toEqual(["11'", "45'", "45+1'"]);
  });
});
