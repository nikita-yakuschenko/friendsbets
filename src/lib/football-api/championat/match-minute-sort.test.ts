import { describe, expect, it } from "vitest";
import {
  compareChampionatMatchEventsByMinute,
  parseMatchMinuteSortParts,
  sortChampionatMatchEventsByMinute,
} from "@/lib/football-api/championat/match-minute-sort";

describe("match-minute-sort", () => {
  it("45' раньше 45+1' и 45+2'", () => {
    expect(parseMatchMinuteSortParts("45'")).toEqual({ base: 45, added: 0 });
    expect(parseMatchMinuteSortParts("45+1'")).toEqual({ base: 45, added: 1 });
    expect(parseMatchMinuteSortParts("45+2'")).toEqual({ base: 45, added: 2 });

    const sorted = sortChampionatMatchEventsByMinute([
      { minuteLabel: "45+2'", minute: 45, playerName: "Б" },
      { minuteLabel: "45'", minute: 45, playerName: "А" },
      { minuteLabel: "45+1'", minute: 45, playerName: "В" },
    ]);

    expect(sorted.map((e) => e.minuteLabel)).toEqual(["45'", "45+1'", "45+2'"]);
  });

  it("сортирует карточки Канада — Босния по minuteLabel", () => {
    const cards = sortChampionatMatchEventsByMinute([
      {
        minuteLabel: "45+1'",
        minute: 45,
        playerName: "Йово Лукич",
      },
      {
        minuteLabel: "11'",
        minute: 11,
        playerName: "Алистер Джонстон",
      },
      {
        minuteLabel: "45'",
        minute: 45,
        playerName: "Эрмедин Демирович",
      },
      {
        minuteLabel: "53'",
        minute: 53,
        playerName: "Люк Де Фужероль",
      },
    ]);

    expect(cards.map((e) => e.minuteLabel)).toEqual([
      "11'",
      "45'",
      "45+1'",
      "53'",
    ]);
    expect(
      compareChampionatMatchEventsByMinute(
        { minuteLabel: "45'", minute: 45, playerName: "Э" },
        { minuteLabel: "45+1'", minute: 45, playerName: "Й" },
      ),
    ).toBeLessThan(0);
  });
});
