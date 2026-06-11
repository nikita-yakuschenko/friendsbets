import { describe, expect, it } from "vitest";
import {
  championatEventsToDbRows,
  dbRowToChampionatEvent,
} from "@/lib/football-api/championat/match-event-store";

describe("match-event-store", () => {
  it("конвертирует события в строки БД и обратно", () => {
    const events = [
      {
        id: "proto-g-0-9-player",
        type: "GOAL" as const,
        minute: 9,
        minuteLabel: "9'",
        playerName: "Хулиан Киньонес",
        assistName: "Эрик Лира",
        score: "1:0",
        teamSide: "home" as const,
        section: "goals" as const,
      },
    ];

    const rows = championatEventsToDbRows("match-1", events);
    expect(rows[0]?.externalKey).toBe("proto-g-0-9-player");
    expect(rows[0]?.assistName).toBe("Эрик Лира");

    const roundTrip = dbRowToChampionatEvent(rows[0]!);
    expect(roundTrip.playerName).toBe("Хулиан Киньонес");
    expect(roundTrip.score).toBe("1:0");
  });
});
