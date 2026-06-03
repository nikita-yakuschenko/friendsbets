import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameParticipantRole, UserRole } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  prisma: {
    game: {
      findUnique: vi.fn(),
    },
    gameParticipant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/game-invite", () => ({
  findGameByInviteCode: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { findGameByInviteCode } from "@/lib/game-invite";
import {
  assertGameParticipant,
  canManageGame,
  isCanonicalGameRoute,
  isGameOrganizer,
  isGameParticipant,
  normalizeGameRouteParam,
  resolveGameIdFromRoute,
  resolveGameViewAccess,
} from "@/lib/game-access";

const participantUser: SessionUser = {
  id: "user-1",
  email: "u@test.com",
  name: "User",
  role: UserRole.PARTICIPANT,
};

const superadmin: SessionUser = {
  id: "admin-1",
  email: "admin@test.com",
  name: "Admin",
  role: UserRole.ADMIN,
};

describe("game-access helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizeGameRouteParam декодирует сегмент", () => {
    expect(normalizeGameRouteParam("ABC%20123")).toBe("ABC 123");
  });

  it("isCanonicalGameRoute сравнивает invite без учёта регистра", () => {
    expect(isCanonicalGameRoute("abc123", "ABC123")).toBe(true);
    expect(isCanonicalGameRoute("other", "ABC123")).toBe(false);
  });

  it("resolveGameIdFromRoute находит по invite", async () => {
    vi.mocked(findGameByInviteCode).mockResolvedValue({
      id: "game-1",
      inviteCode: "ABC123",
    } as never);

    const id = await resolveGameIdFromRoute("abc123");
    expect(id).toBe("game-1");
  });

  it("resolveGameViewAccess: участник может прогнозировать", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: "g1",
      inviteCode: "INV1",
      title: "T",
    } as never);
    vi.mocked(prisma.gameParticipant.findUnique).mockResolvedValue({
      id: "p1",
    } as never);

    const access = await resolveGameViewAccess(participantUser, "g1");
    expect(access.status).toBe("ok");
    if (access.status === "ok") {
      expect(access.canPredict).toBe(true);
      expect(access.isPlatformOversight).toBe(false);
    }
  });

  it("resolveGameViewAccess: суперадмин без участия — надзор", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: "g1",
      inviteCode: "INV1",
      title: "T",
    } as never);
    vi.mocked(prisma.gameParticipant.findUnique).mockResolvedValue(null);

    const access = await resolveGameViewAccess(superadmin, "g1");
    expect(access.status).toBe("ok");
    if (access.status === "ok") {
      expect(access.canPredict).toBe(false);
      expect(access.isPlatformOversight).toBe(true);
    }
  });

  it("resolveGameViewAccess: гость — need_join", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: "g1",
      inviteCode: "INV1",
      title: "T",
    } as never);
    vi.mocked(prisma.gameParticipant.findUnique).mockResolvedValue(null);

    const access = await resolveGameViewAccess(participantUser, "g1");
    expect(access.status).toBe("need_join");
  });

  it("assertGameParticipant бросает FORBIDDEN", async () => {
    vi.mocked(prisma.gameParticipant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({ id: "g1" } as never);

    await expect(assertGameParticipant(participantUser, "g1")).rejects.toThrow(
      "FORBIDDEN",
    );
  });

  it("canManageGame: организатор да, обычный участник нет", async () => {
    vi.mocked(prisma.gameParticipant.findUnique).mockResolvedValue({
      role: GameParticipantRole.ORGANIZER,
    } as never);
    expect(await canManageGame(participantUser, "g1")).toBe(true);
    expect(await isGameOrganizer(participantUser.id, "g1")).toBe(true);

    vi.mocked(prisma.gameParticipant.findUnique).mockResolvedValue({
      role: GameParticipantRole.PARTICIPANT,
      id: "p1",
    } as never);
    expect(await canManageGame(participantUser, "g1")).toBe(false);
    expect(await isGameParticipant(participantUser.id, "g1")).toBe(true);
  });

  it("canManageGame: суперадмин всегда может", async () => {
    expect(await canManageGame(superadmin, "g1")).toBe(true);
  });
});
