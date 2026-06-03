"use server";

import { revalidatePath } from "next/cache";
import { GameParticipantRole } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  applyActiveGameAfterMembershipEnd,
  validateNextActiveBeforeMembershipEnd,
} from "@/lib/apply-active-after-membership-end";
import { canDeleteSoloOrganizerTournament } from "@/lib/game-organizer";
import { revalidateGamePaths } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import type { MembershipEndResult } from "@/lib/apply-active-after-membership-end";

export async function deleteSoloTournamentAction(
  gameId: string,
  nextActiveInviteCode?: string,
): Promise<MembershipEndResult> {
  const session = await requireAuth();

  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId: session.id } },
    include: { game: { select: { inviteCode: true } } },
  });

  if (!participant) {
    return { error: "Вы не участник этого турнира." };
  }

  const [organizerCount, participantsCount] = await Promise.all([
    prisma.gameParticipant.count({
      where: { gameId, role: GameParticipantRole.ORGANIZER },
    }),
    prisma.gameParticipant.count({ where: { gameId } }),
  ]);

  if (
    !canDeleteSoloOrganizerTournament(
      participant.role,
      organizerCount,
      participantsCount,
    )
  ) {
    return { error: "Удаление недоступно для этого турнира." };
  }

  const removedInviteCode = participant.game.inviteCode;

  const precheck = await validateNextActiveBeforeMembershipEnd(
    session.id,
    removedInviteCode,
    participantsCount,
    nextActiveInviteCode,
  );
  if (precheck.error) {
    return precheck;
  }

  await revalidateGamePaths(gameId);
  await prisma.game.delete({ where: { id: gameId } });

  const activeResult = await applyActiveGameAfterMembershipEnd(
    session.id,
    removedInviteCode,
    nextActiveInviteCode,
  );
  if (activeResult.error) {
    return activeResult;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/", "layout");

  return { success: true, clearedAllGames: activeResult.clearedAllGames };
}
