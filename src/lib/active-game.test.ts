import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  gameParticipant: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/game-invite", () => ({
  findGameByInviteCode: vi.fn(async (code: string) =>
    code === "GAMEA"
      ? { id: "g-a", inviteCode: "GAMEA" }
      : code === "GAMEB"
        ? { id: "g-b", inviteCode: "GAMEB" }
        : null,
  ),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { resolveActiveGameInviteCode } from "@/lib/active-game";

describe("resolveActiveGameInviteCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.gameParticipant.findUnique.mockResolvedValue({ id: "p1" });
  });

  it("сохранённый в БД текущий важнее fallback", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      activeGame: { id: "g-a", inviteCode: "GAMEA" },
    });

    const code = await resolveActiveGameInviteCode("user-1", {
      fallbackInviteCode: "GAMEB",
    });

    expect(code).toBe("GAMEA");
  });

  it("на странице турнира preferred важнее сохранённого", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      activeGame: { id: "g-a", inviteCode: "GAMEA" },
    });

    const code = await resolveActiveGameInviteCode("user-1", {
      preferredInviteCode: "GAMEB",
      fallbackInviteCode: "GAMEA",
    });

    expect(code).toBe("GAMEB");
  });
});
