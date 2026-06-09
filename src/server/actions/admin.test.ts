import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/generated/prisma/client";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    game: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/template-match-admin", () => ({
  listTemplateTournamentIdsForRecalc: vi.fn(),
  recalculateAllScoresForTournament: vi.fn(),
  userCanManageTournament: vi.fn(),
}));

vi.mock("@/lib/game-access", () => ({
  revalidateGamePaths: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  listTemplateTournamentIdsForRecalc,
  recalculateAllScoresForTournament,
  userCanManageTournament,
} from "@/lib/template-match-admin";
import {
  recalculateAllScoresAction,
  updateGameTitleBySuperadminAction,
} from "@/server/actions/admin";

describe("recalculateAllScoresAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("суперадмин пересчитывает шаблонные турниры", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "admin",
      email: "a@b.c",
      name: "A",
      role: UserRole.ADMIN,
    });
    vi.mocked(listTemplateTournamentIdsForRecalc).mockResolvedValue(["t-1"]);
    vi.mocked(prisma.game.findMany).mockResolvedValue([{ id: "g-1" }] as never);

    const result = await recalculateAllScoresAction();

    expect(result.success).toBe(true);
    expect(recalculateAllScoresForTournament).toHaveBeenCalledWith("t-1");
  });

  it("участник без организатора — ошибка", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "u@t.c",
      name: "U",
      role: UserRole.PARTICIPANT,
    });
    vi.mocked(prisma.game.findMany).mockResolvedValue([]);

    const result = await recalculateAllScoresAction();

    expect(result.error).toMatch(/нет турниров/i);
  });

  it("запрещает чужой tournamentId", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "u@t.c",
      name: "U",
      role: UserRole.PARTICIPANT,
    });
    vi.mocked(userCanManageTournament).mockResolvedValue(false);

    const result = await recalculateAllScoresAction({
      tournamentId: "foreign-t",
    });

    expect(result.error).toMatch(/нет доступа/i);
  });
});

describe("updateGameTitleBySuperadminAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("суперадмин переименовывает турнир", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "admin",
      email: "a@b.c",
      name: "A",
      role: UserRole.ADMIN,
    });
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: "g1",
      inviteCode: "ABC",
      title: "Старое",
    } as never);
    vi.mocked(prisma.game.update).mockResolvedValue({} as never);

    const result = await updateGameTitleBySuperadminAction("g1", "Новое имя");

    expect(result.success).toBe(true);
    expect(prisma.game.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { title: "Новое имя" },
    });
  });

  it("участник без прав — ошибка", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "u@t.c",
      name: "U",
      role: UserRole.PARTICIPANT,
    });

    const result = await updateGameTitleBySuperadminAction("g1", "Новое");

    expect(result.error).toMatch(/нет доступа/i);
    expect(prisma.game.update).not.toHaveBeenCalled();
  });
});
