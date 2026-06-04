import { describe, expect, it } from "vitest";
import { GameParticipantRole } from "@/generated/prisma/client";
import { buildMyTournamentRows } from "@/lib/my-tournaments-rows";

const baseMembership = {
  role: GameParticipantRole.ORGANIZER,
  game: {
    id: "g1",
    title: "Кубок друзей",
    inviteCode: "ABC123",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    tournament: { externalId: "championat:tournament:1" },
    accessMode: "REQUEST",
    scoringRule: { id: "rule-1", title: "Классика" },
    createdBy: { name: "Оля" },
    participants: [{ displayName: "Оля" }],
    _count: { participants: 3 },
  },
};

describe("buildMyTournamentRows", () => {
  it("собирает строку с sourceLabel и правами", () => {
    const rows = buildMyTournamentRows({
      memberships: [baseMembership],
      activeInviteCode: "ABC123",
      sourceLabelByExternalId: new Map([
        ["championat:tournament:1", "ЧМ-2026"],
      ]),
      tournamentStartedByGameId: new Map([["g1", false]]),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceLabel).toBe("ЧМ-2026");
    expect(rows[0]?.isActive).toBe(true);
    expect(rows[0]?.canSetAsActive).toBe(false);
    expect(rows[0]?.organizerLabel).toBe("Организатор");
    expect(rows[0]?.canDelete).toBe(false);
    expect(rows[0]?.canLeave).toBe(false);
    expect(rows[0]?.accessMode).toBe("REQUEST");
    expect(rows[0]?.canChangeTournamentSettings).toBe(true);
  });

  it("помечает неактивный турнир и canSetAsActive при нескольких играх", () => {
    const rows = buildMyTournamentRows({
      memberships: [
        baseMembership,
        {
          ...baseMembership,
          game: {
            ...baseMembership.game,
            id: "g2",
            title: "Второй",
            inviteCode: "XYZ999",
          },
        },
      ],
      activeInviteCode: "ABC123",
      sourceLabelByExternalId: new Map(),
      tournamentStartedByGameId: new Map([
        ["g1", false],
        ["g2", false],
      ]),
    });

    expect(rows[1]?.isActive).toBe(false);
    expect(rows[1]?.canSetAsActive).toBe(true);
    expect(rows[1]?.otherTournaments).toHaveLength(1);
  });
});
