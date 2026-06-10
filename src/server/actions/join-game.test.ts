import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-1",
    email: "u@test.com",
    name: "User",
    role: "PARTICIPANT",
  })),
}));

vi.mock("@/lib/join-game-preview", () => ({
  resolveGameJoinPreview: vi.fn(),
}));

vi.mock("@/lib/game-invite", () => ({
  findGameByInviteCode: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    game: { findUnique: vi.fn() },
    gameParticipant: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/active-game", () => ({
  persistActiveGameForUser: vi.fn(),
}));

vi.mock("@/lib/game-access", () => ({
  revalidateGamePaths: vi.fn(),
}));

import { resolveGameJoinPreview } from "@/lib/join-game-preview";
import { lookupGameByInviteAction } from "@/server/actions/join-game";

function form(inviteCode: string) {
  const fd = new FormData();
  fd.set("inviteCode", inviteCode);
  return fd;
}

describe("lookupGameByInviteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("возвращает ошибку при неверном коде", async () => {
    vi.mocked(resolveGameJoinPreview).mockResolvedValue({
      error: "Неверный invite-код турнира.",
    });

    const result = await lookupGameByInviteAction(undefined, form("BAD"));
    expect(result.error).toMatch(/invite/i);
  });

  it("возвращает превью турнира", async () => {
    vi.mocked(resolveGameJoinPreview).mockResolvedValue({
      preview: {
        gameId: "g1",
        title: "Тест",
        inviteCode: "ABC123",
        organizerName: "Org",
        scoringRuleTitle: "Классика",
        participantsCount: 3,
        accessMode: "OPEN",
        alreadyMember: false,
        joinRequestStatus: null,
      },
    });

    const result = await lookupGameByInviteAction(undefined, form("ABC123"));
    expect(result.success).toBe(true);
    expect(result.preview?.inviteCode).toBe("ABC123");
  });
});
