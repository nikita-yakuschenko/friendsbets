import { describe, expect, it, vi } from "vitest";
import { CHAMPIONAT_WORLD_CUP_2026 } from "@/lib/football-api/championat/constants";

vi.mock("@/lib/db", () => ({
  prisma: {
    tournament: {
      findUnique: vi.fn(async () => ({
        externalId: `championat:tournament:${CHAMPIONAT_WORLD_CUP_2026.tournamentId}`,
        description: null,
      })),
    },
    tournamentTemplate: {
      findFirst: vi.fn(async () => null),
    },
  },
}));

describe("resolveChampionatSourceForTournament", () => {
  it("fallback на константы ЧМ-2026 без шаблона", async () => {
    const { resolveChampionatSourceForTournament } = await import(
      "@/lib/football-api/championat/resolve-source"
    );
    const source = await resolveChampionatSourceForTournament("tournament-id");
    expect(source?.championatTournamentId).toBe(
      CHAMPIONAT_WORLD_CUP_2026.tournamentId,
    );
    expect(source?.sportSlug).toBe(CHAMPIONAT_WORLD_CUP_2026.sportSlug);
  });
});
