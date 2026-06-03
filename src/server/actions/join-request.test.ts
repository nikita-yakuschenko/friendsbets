import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GameAccessMode,
  GameJoinRequestStatus,
} from "@/generated/prisma/client";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-1",
    email: "u@test.com",
    name: "Applicant",
    role: "PARTICIPANT",
  })),
}));

vi.mock("@/lib/game-invite", () => ({
  findGameByInviteCode: vi.fn(),
}));

vi.mock("@/lib/active-game", () => ({
  setActiveGameInviteCookie: vi.fn(),
}));

vi.mock("@/lib/game-organizer-users", () => ({
  isGameOrganizerUser: vi.fn(),
}));

vi.mock("@/lib/game-access", () => ({
  revalidateGamePaths: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notifyOrganizersOfJoinRequest: vi.fn(),
  notifyJoinRequestApproved: vi.fn(),
  notifyJoinRequestRejected: vi.fn(),
  markJoinRequestOrganizerNotificationsRead: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    game: { findUnique: vi.fn() },
    gameParticipant: { findUnique: vi.fn(), upsert: vi.fn() },
    gameJoinRequest: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userNotification: { deleteMany: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

import { findGameByInviteCode } from "@/lib/game-invite";
import { isGameOrganizerUser } from "@/lib/game-organizer-users";
import { notifyOrganizersOfJoinRequest } from "@/lib/notifications";
import { prisma } from "@/lib/db";
import {
  requestJoinGameAction,
  respondToJoinRequestAction,
} from "@/server/actions/join-request";

function form(inviteCode: string) {
  const fd = new FormData();
  fd.set("inviteCode", inviteCode);
  return fd;
}

describe("requestJoinGameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findGameByInviteCode).mockResolvedValue({
      id: "game-1",
      inviteCode: "REQ12345",
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      accessMode: GameAccessMode.REQUEST,
    } as never);
    vi.mocked(prisma.gameParticipant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.gameJoinRequest.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.gameJoinRequest.create).mockResolvedValue({
      id: "jr-1",
    } as never);
  });

  it("отклоняет OPEN турнир", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      accessMode: GameAccessMode.OPEN,
    } as never);

    const result = await requestJoinGameAction(undefined, form("REQ12345"));
    expect(result.error).toMatch(/без заявки/i);
  });

  it("создаёт заявку и уведомляет организаторов", async () => {
    const result = await requestJoinGameAction(undefined, form("REQ12345"));
    expect(result.success).toBe(true);
    expect(notifyOrganizersOfJoinRequest).toHaveBeenCalledWith(
      "game-1",
      "jr-1",
    );
  });
});

describe("respondToJoinRequestAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isGameOrganizerUser).mockResolvedValue(true);
    vi.mocked(prisma.gameJoinRequest.findUnique).mockResolvedValue({
      id: "jr-1",
      gameId: "game-1",
      userId: "user-2",
      status: GameJoinRequestStatus.PENDING,
      game: { id: "game-1", inviteCode: "REQ123", title: "Cup" },
      user: { id: "user-2", name: "Bob" },
    } as never);
  });

  it("отклоняет без прав организатора", async () => {
    vi.mocked(isGameOrganizerUser).mockResolvedValue(false);
    const result = await respondToJoinRequestAction("jr-1", "approve");
    expect(result.error).toMatch(/прав/i);
  });

  it("одобряет заявку", async () => {
    const result = await respondToJoinRequestAction("jr-1", "approve");
    expect(result.success).toBe(true);
    expect(prisma.gameParticipant.upsert).toHaveBeenCalled();
  });
});
