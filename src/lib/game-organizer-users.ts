import { GameParticipantRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function getGameOrganizerUserIds(gameId: string): Promise<string[]> {
  const rows = await prisma.gameParticipant.findMany({
    where: { gameId, role: GameParticipantRole.ORGANIZER },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function isGameOrganizerUser(
  userId: string,
  gameId: string,
): Promise<boolean> {
  const row = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
    select: { role: true },
  });
  return row?.role === GameParticipantRole.ORGANIZER;
}
