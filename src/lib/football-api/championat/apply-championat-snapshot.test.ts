import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { applyChampionatSnapshotToMatch } from "@/lib/football-api/championat/apply-championat-snapshot";

const updateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

vi.mock("@/lib/template-match-admin", () => ({
  recalculateMatchScoresForTournament: vi.fn(),
}));

describe("applyChampionatSnapshotToMatch", () => {
  beforeEach(() => {
    updateMock.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  const baseMatch = {
    id: "m1",
    tournamentId: "t1",
    startsAt: new Date("2026-06-27T20:00:00Z"),
    status: MatchStatus.LIVE,
    homeScore: null,
    awayScore: null,
    homeTeamId: "h1",
    awayTeamId: "a1",
    championatFinishedAt: null,
  };

  it("сбрасывает ложный LIVE у будущего матча", async () => {
    const result = await applyChampionatSnapshotToMatch(baseMatch, {
      events: [],
      livePhase: "scheduled",
      liveStatus: { phase: "scheduled", rawText: "Не начался" },
    });
    expect(result.updated).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: MatchStatus.SCHEDULED }),
      }),
    );
  });

  it("обновляет счёт при изменении", async () => {
    const result = await applyChampionatSnapshotToMatch(
      { ...baseMatch, status: MatchStatus.LIVE, startsAt: new Date("2026-06-01T10:00:00Z") },
      {
        events: [],
        homeScore: 2,
        awayScore: 1,
        livePhase: "live",
        liveStatus: { phase: "live", rawText: "1-й тайм" },
      },
    );
    expect(result.updated).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ homeScore: 2, awayScore: 1 }),
      }),
    );
  });
});
