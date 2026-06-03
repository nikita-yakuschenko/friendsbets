"use server";

import { revalidatePath } from "next/cache";
import { GameParticipantRole } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  applyActiveGameAfterMembershipEnd,
  validateNextActiveBeforeMembershipEnd,
} from "@/lib/apply-active-after-membership-end";
import { revalidateGamePaths } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import type { MembershipEndResult } from "@/lib/apply-active-after-membership-end";

export async function leaveGameAction(
  gameId: string,
  nextActiveInviteCode?: string,
): Promise<MembershipEndResult> {
  const session = await requireAuth();

  const participant = await prisma.gameParticipant.findUnique({
    where: {
      gameId_userId: { gameId, userId: session.id },
    },
    include: { game: { select: { inviteCode: true } } },
  });

  if (!participant) {
    return { error: "Вы не участник этого турнира." };
  }

  if (participant.role === GameParticipantRole.ORGANIZER) {
    const organizerCount = await prisma.gameParticipant.count({
      where: { gameId, role: GameParticipantRole.ORGANIZER },
    });
    if (organizerCount <= 1) {
      return {
        error:
          "Вы единственный организатор. Назначьте другого организатора или удалите турнир.",
      };
    }
  }

  const membershipCount = await prisma.gameParticipant.count({
    where: { userId: session.id },
  });
  const precheck = await validateNextActiveBeforeMembershipEnd(
    session.id,
    participant.game.inviteCode,
    membershipCount,
    nextActiveInviteCode,
  );
  if (precheck.error) {
    return precheck;
  }

  await prisma.$transaction([
    prisma.prediction.deleteMany({
      where: { gameId, userId: session.id },
    }),
    prisma.bonusPrediction.deleteMany({
      where: { gameId, userId: session.id },
    }),
    prisma.predictionReminder.deleteMany({
      where: { gameId, userId: session.id },
    }),
    prisma.gameParticipant.delete({
      where: { id: participant.id },
    }),
  ]);

  const activeResult = await applyActiveGameAfterMembershipEnd(
    session.id,
    participant.game.inviteCode,
    nextActiveInviteCode,
  );
  if (activeResult.error) {
    return activeResult;
  }

  await revalidateGamePaths(gameId);
  revalidatePath("/");
  revalidatePath("/", "layout");

  return { success: true, clearedAllGames: activeResult.clearedAllGames };
}
