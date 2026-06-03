"use server";

import { revalidatePath } from "next/cache";
import { GameParticipantRole } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { revalidateGamePaths } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { isSuperadmin } from "@/lib/roles";
import type { ActionResult } from "@/server/actions/auth";

async function assertSuperadmin() {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function setGameParticipantRoleBySuperadminAction(
  gameId: string,
  userId: string,
  role: "ORGANIZER" | "PARTICIPANT",
): Promise<ActionResult> {
  const participantRole =
    role === "ORGANIZER"
      ? GameParticipantRole.ORGANIZER
      : GameParticipantRole.PARTICIPANT;
  try {
    await assertSuperadmin();
  } catch {
    return { error: "Нет доступа." };
  }

  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
    include: { user: { select: { name: true } }, game: { select: { title: true } } },
  });

  if (!participant) {
    return { error: "Участник не найден в этом турнире." };
  }

  if (participant.role === participantRole) {
    return { success: true, message: "Роль уже назначена." };
  }

  if (
    participant.role === GameParticipantRole.ORGANIZER &&
    participantRole === GameParticipantRole.PARTICIPANT
  ) {
    const organizerCount = await prisma.gameParticipant.count({
      where: { gameId, role: GameParticipantRole.ORGANIZER },
    });
    if (organizerCount <= 1) {
      return {
        error: "Нельзя снять роль у единственного организатора. Назначьте другого.",
      };
    }
  }

  await prisma.gameParticipant.update({
    where: { id: participant.id },
    data: { role: participantRole },
  });

  await revalidateGamePaths(gameId);
  revalidatePath("/admin");

  const label =
    participantRole === GameParticipantRole.ORGANIZER
      ? "организатором"
      : "участником";

  return {
    success: true,
    message: `«${participant.user.name}» теперь ${label} «${participant.game.title}».`,
  };
}

export async function removeGameParticipantBySuperadminAction(
  gameId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    await assertSuperadmin();
  } catch {
    return { error: "Нет доступа." };
  }

  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
    include: { user: { select: { name: true } }, game: { select: { title: true } } },
  });

  if (!participant) {
    return { error: "Участник не найден в этом турнире." };
  }

  if (participant.role === GameParticipantRole.ORGANIZER) {
    const organizerCount = await prisma.gameParticipant.count({
      where: { gameId, role: GameParticipantRole.ORGANIZER },
    });
    if (organizerCount <= 1) {
      return {
        error:
          "Нельзя исключить единственного организатора. Назначьте другого или удалите турнир.",
      };
    }
  }

  await prisma.$transaction([
    prisma.prediction.deleteMany({ where: { gameId, userId } }),
    prisma.bonusPrediction.deleteMany({ where: { gameId, userId } }),
    prisma.predictionReminder.deleteMany({ where: { gameId, userId } }),
    prisma.gameParticipant.delete({ where: { id: participant.id } }),
  ]);

  await revalidateGamePaths(gameId);
  revalidatePath("/admin");

  return {
    success: true,
    message: `«${participant.user.name}» исключён из «${participant.game.title}».`,
  };
}
