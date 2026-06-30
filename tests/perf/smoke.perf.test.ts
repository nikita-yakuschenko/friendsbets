import { describe, expect, it } from "vitest";
import { buildMyTournamentRows } from "@/lib/my-tournaments-rows";
import { parseChampionatCalendarHtml } from "@/lib/football-api/championat/parser";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GameParticipantRole } from "@/generated/prisma/client";

const calendarHtml = readFileSync(
  join(process.cwd(), "tests/fixtures/championat-calendar-snippet.html"),
  "utf8",
);

describe("performance smoke", () => {
  it("парсер календаря укладывается в разумное время", () => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      parseChampionatCalendarHtml(calendarHtml);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it("сборка 50 строк турниров не деградирует", () => {
    const memberships = Array.from({ length: 50 }, (_, i) => ({
      role: GameParticipantRole.PARTICIPANT,
      game: {
        id: `g-${i}`,
        title: `T${i}`,
        inviteCode: `CODE${i}`,
        createdAt: new Date(),
        tournament: { externalId: null },
        accessMode: "OPEN",
        penaltyScoringSynthetic: false,
        scoringRule: { id: "sr-1", title: "Classic" },
        createdBy: { name: "Creator" },
        participants: [],
        _count: { participants: 2 },
      },
    }));

    const start = performance.now();
    const rows = buildMyTournamentRows({
      memberships,
      activeInviteCode: "CODE0",
      sourceLabelByExternalId: new Map(),
      tournamentStartedByGameId: new Map(
        memberships.map((m) => [m.game.id, false]),
      ),
    });
    expect(rows).toHaveLength(50);
    expect(performance.now() - start).toBeLessThan(200);
  });

});
