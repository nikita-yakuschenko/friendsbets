"use server";

import { revalidatePath } from "next/cache";
import { GameParticipantRole } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { revalidateGamePaths } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export async function leaveGameAction(gameId: string): Promise<ActionResult> {
  const session = await requireAuth();

  const participant = await prisma.gameParticipant.findUnique({
    where: {
      gameId_userId: { gameId, userId: session.id },
    },
  });

  if (!participant) {
    return { error: "Вы не участник этого турнира." };
  }

  if (participant.role === GameParticipantRole.ORGANIZER) {
    return {
      error:
        "Организатор не может покинуть турнир. Удалите турнир, если он больше не нужен.",
    };
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

  await revalidateGamePaths(gameId);
  revalidatePath("/");
  revalidatePath("/", "layout");

  return { success: true };
}
