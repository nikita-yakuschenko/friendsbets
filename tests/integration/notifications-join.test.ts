import { afterAll, describe, expect, it } from "vitest";
import {
  GameAccessMode,
  GameJoinRequestStatus,
  GameParticipantRole,
  UserNotificationKind,
} from "@/generated/prisma/client";
import { notifyOrganizersOfJoinRequest } from "@/lib/notifications";
import {
  createTestPrisma,
  getTestDatabaseUrl,
} from "../helpers/integration-db";

const testDbUrl = getTestDatabaseUrl();
const describeIfDb = testDbUrl ? describe : describe.skip;

describeIfDb("join notifications integration", () => {
  const prisma = createTestPrisma();
  const suffix = Date.now().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const cleanup: {
    gameId?: string;
    joinRequestId?: string;
    userIds: string[];
  } = { userIds: [] };

  afterAll(async () => {
    if (cleanup.joinRequestId) {
      await prisma.userNotification.deleteMany({
        where: { joinRequestId: cleanup.joinRequestId },
      });
      await prisma.gameJoinRequest.delete({ where: { id: cleanup.joinRequestId } });
    }
    if (cleanup.gameId) {
      await prisma.gameParticipant.deleteMany({ where: { gameId: cleanup.gameId } });
      await prisma.game.delete({ where: { id: cleanup.gameId } });
    }
    if (cleanup.userIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
    }
    await prisma.$disconnect();
  });

  it("создаёт JOIN_REQUEST_RECEIVED организатору", async () => {
    const scoring = await prisma.scoringRule.findFirst();
    const tournament = await prisma.tournament.findFirst();
    if (!scoring || !tournament) return;

    const organizer = await prisma.user.create({
      data: {
        email: `org-${suffix}@test.local`,
        name: "Org",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
      },
    });
    const applicant = await prisma.user.create({
      data: {
        email: `app-${suffix}@test.local`,
        name: "App",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
      },
    });

    const game = await prisma.game.create({
      data: {
        tournamentId: tournament.id,
        scoringRuleId: scoring.id,
        createdById: organizer.id,
        title: "Request game",
        slug: `req-game-${suffix}`,
        inviteCode: `RG${suffix}`.slice(0, 8),
        accessMode: GameAccessMode.REQUEST,
        participants: {
          create: {
            userId: organizer.id,
            displayName: "Org",
            role: GameParticipantRole.ORGANIZER,
          },
        },
      },
    });

    cleanup.gameId = game.id;
    cleanup.userIds = [organizer.id, applicant.id];

    const joinRequest = await prisma.gameJoinRequest.create({
      data: {
        gameId: game.id,
        userId: applicant.id,
        status: GameJoinRequestStatus.PENDING,
      },
    });
    cleanup.joinRequestId = joinRequest.id;

    await notifyOrganizersOfJoinRequest(game.id, joinRequest.id);

    const count = await prisma.userNotification.count({
      where: {
        joinRequestId: joinRequest.id,
        kind: UserNotificationKind.JOIN_REQUEST_RECEIVED,
        userId: organizer.id,
      },
    });
    expect(count).toBe(1);
  });
});
