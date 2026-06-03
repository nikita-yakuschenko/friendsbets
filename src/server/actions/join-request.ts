"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  GameAccessMode,
  GameJoinRequestStatus,
  GameParticipantRole,
  UserNotificationKind,
} from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { setActiveGameInviteCookie } from "@/lib/active-game";
import { findGameByInviteCode } from "@/lib/game-invite";
import { gamePath } from "@/lib/game-path";
import { isGameOrganizerUser } from "@/lib/game-organizer-users";
import { revalidateGamePaths } from "@/lib/game-access";
import {
  markJoinRequestOrganizerNotificationsRead,
  notifyJoinRequestApproved,
  notifyJoinRequestRejected,
  notifyOrganizersOfJoinRequest,
} from "@/lib/notifications";
import {
  normalizeInviteCodeInput,
  validateInviteCodeFormat,
} from "@/lib/invite-code";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export async function requestJoinGameAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const inviteCodeRaw = String(formData.get("inviteCode") ?? "").trim();

  if (!inviteCodeRaw) {
    return { error: "Код турнира не указан. Найдите турнир заново." };
  }

  const formatError = validateInviteCodeFormat(inviteCodeRaw);
  if (formatError) return { error: formatError };

  const inviteCode = normalizeInviteCodeInput(inviteCodeRaw);
  const game = await findGameByInviteCode(inviteCode);

  if (!game) {
    return { error: "Турнир не найден." };
  }

  const gameRow = await prisma.game.findUnique({
    where: { id: game.id },
    select: { accessMode: true },
  });

  if (!gameRow || gameRow.accessMode !== GameAccessMode.REQUEST) {
    return { error: "В этот турнир можно вступить без заявки." };
  }

  const existingMember = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId: game.id, userId: session.id } },
  });
  if (existingMember) {
    await setActiveGameInviteCookie(game.inviteCode);
    redirect(gamePath(game.inviteCode));
  }

  const existingRequest = await prisma.gameJoinRequest.findUnique({
    where: { gameId_userId: { gameId: game.id, userId: session.id } },
  });

  if (existingRequest?.status === GameJoinRequestStatus.PENDING) {
    return { success: true, message: "Заявка уже отправлена." };
  }

  if (existingRequest?.status === GameJoinRequestStatus.APPROVED) {
    return { error: "Вы уже приняты в этот турнир." };
  }

  const joinRequest = existingRequest
    ? await prisma.gameJoinRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: GameJoinRequestStatus.PENDING,
          respondedAt: null,
          respondedById: null,
          updatedAt: new Date(),
        },
      })
    : await prisma.gameJoinRequest.create({
        data: {
          gameId: game.id,
          userId: session.id,
          status: GameJoinRequestStatus.PENDING,
        },
      });

  await prisma.userNotification.deleteMany({
    where: {
      joinRequestId: joinRequest.id,
      kind: UserNotificationKind.JOIN_REQUEST_RECEIVED,
    },
  });
  await notifyOrganizersOfJoinRequest(game.id, joinRequest.id);

  revalidatePath("/join");
  revalidatePath("/", "layout");
  revalidateNotificationsPaths(game.inviteCode);

  return { success: true, message: "Заявка отправлена организатору." };
}

function revalidateNotificationsPaths(gameInviteCode: string) {
  revalidatePath(`/game/${gameInviteCode}/more/notifications`);
  revalidatePath(`/game/${gameInviteCode}/more`);
}

export async function respondToJoinRequestAction(
  joinRequestId: string,
  decision: "approve" | "reject",
): Promise<ActionResult> {
  const session = await requireAuth();

  const joinRequest = await prisma.gameJoinRequest.findUnique({
    where: { id: joinRequestId },
    include: {
      game: { select: { id: true, inviteCode: true, title: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!joinRequest) {
    return { error: "Заявка не найдена." };
  }

  if (joinRequest.status !== GameJoinRequestStatus.PENDING) {
    return { error: "Заявка уже обработана." };
  }

  const canRespond = await isGameOrganizerUser(session.id, joinRequest.gameId);
  if (!canRespond) {
    return { error: "Недостаточно прав для ответа на заявку." };
  }

  const now = new Date();

  if (decision === "approve") {
    await prisma.$transaction([
      prisma.gameParticipant.upsert({
        where: {
          gameId_userId: {
            gameId: joinRequest.gameId,
            userId: joinRequest.userId,
          },
        },
        create: {
          gameId: joinRequest.gameId,
          userId: joinRequest.userId,
          displayName: joinRequest.user.name,
          role: GameParticipantRole.PARTICIPANT,
        },
        update: {},
      }),
      prisma.gameJoinRequest.update({
        where: { id: joinRequestId },
        data: {
          status: GameJoinRequestStatus.APPROVED,
          respondedAt: now,
          respondedById: session.id,
        },
      }),
    ]);

    await notifyJoinRequestApproved(joinRequest.userId, joinRequestId);
    await markJoinRequestOrganizerNotificationsRead(joinRequestId);
    await revalidateGamePaths(joinRequest.gameId);
  } else {
    await prisma.gameJoinRequest.update({
      where: { id: joinRequestId },
      data: {
        status: GameJoinRequestStatus.REJECTED,
        respondedAt: now,
        respondedById: session.id,
      },
    });

    await notifyJoinRequestRejected(joinRequest.userId, joinRequestId);
    await markJoinRequestOrganizerNotificationsRead(joinRequestId);
  }

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidateNotificationsPaths(joinRequest.game.inviteCode);

  return {
    success: true,
    message: decision === "approve" ? "Участник добавлен." : "Заявка отклонена.",
  };
}
