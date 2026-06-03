import {
  GameJoinRequestStatus,
  UserNotificationKind,
} from "@/generated/prisma/client";
import { getGameOrganizerUserIds } from "@/lib/game-organizer-users";
import { prisma } from "@/lib/db";

export type NotificationListItem = {
  id: string;
  kind: UserNotificationKind;
  readAt: string | null;
  createdAt: string;
  joinRequest: {
    id: string;
    status: GameJoinRequestStatus;
    game: { id: string; title: string; inviteCode: string };
    user: { id: string; name: string };
  } | null;
};

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.userNotification.count({
    where: { userId, readAt: null },
  });
}

export async function listUserNotifications(
  userId: string,
): Promise<NotificationListItem[]> {
  const rows = await prisma.userNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      joinRequest: {
        include: {
          game: { select: { id: true, title: true, inviteCode: true } },
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    joinRequest: row.joinRequest
      ? {
          id: row.joinRequest.id,
          status: row.joinRequest.status,
          game: row.joinRequest.game,
          user: row.joinRequest.user,
        }
      : null,
  }));
}

export async function notifyOrganizersOfJoinRequest(
  gameId: string,
  joinRequestId: string,
): Promise<void> {
  const organizerIds = await getGameOrganizerUserIds(gameId);
  if (organizerIds.length === 0) return;

  await prisma.userNotification.createMany({
    data: organizerIds.map((userId) => ({
      userId,
      kind: UserNotificationKind.JOIN_REQUEST_RECEIVED,
      joinRequestId,
    })),
  });
}

export async function notifyJoinRequestApproved(
  userId: string,
  joinRequestId: string,
): Promise<void> {
  await prisma.userNotification.create({
    data: {
      userId,
      kind: UserNotificationKind.JOIN_REQUEST_APPROVED,
      joinRequestId,
    },
  });
}

export async function notifyJoinRequestRejected(
  userId: string,
  joinRequestId: string,
): Promise<void> {
  await prisma.userNotification.create({
    data: {
      userId,
      kind: UserNotificationKind.JOIN_REQUEST_REJECTED,
      joinRequestId,
    },
  });
}

export async function markJoinRequestOrganizerNotificationsRead(
  joinRequestId: string,
): Promise<void> {
  await prisma.userNotification.updateMany({
    where: {
      joinRequestId,
      kind: UserNotificationKind.JOIN_REQUEST_RECEIVED,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
