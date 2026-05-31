import { GameParticipantRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import { gamePath } from "@/lib/game-path";
import type { SessionUser } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";

export { gamePath };

export async function resolveGameIdFromRoute(routeParam: string): Promise<string | null> {
  const bySlug = await prisma.game.findUnique({
    where: { slug: routeParam },
    select: { id: true },
  });
  if (bySlug) return bySlug.id;

  const byId = await prisma.game.findUnique({
    where: { id: routeParam },
    select: { id: true },
  });
  return byId?.id ?? null;
}

export async function getGameBySlug(slug: string) {
  return prisma.game.findUnique({ where: { slug } });
}

export async function assertGameParticipant(
  user: SessionUser,
  gameId: string,
) {
  if (isAdmin(user.role)) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error("GAME_NOT_FOUND");
    return game;
  }

  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId: user.id } },
    include: { game: true },
  });

  if (!participant) {
    throw new Error("FORBIDDEN");
  }

  return participant.game;
}

export async function assertGameParticipantBySlug(
  user: SessionUser,
  slug: string,
) {
  const game = await getGameBySlug(slug);
  if (!game) throw new Error("GAME_NOT_FOUND");
  return assertGameParticipant(user, game.id);
}

export async function getUserGames(userId: string) {
  return prisma.gameParticipant.findMany({
    where: { userId },
    include: {
      game: {
        include: {
          tournament: true,
          scoringRule: true,
          _count: { select: { participants: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
}

export async function isGameOrganizer(userId: string, gameId: string): Promise<boolean> {
  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
    select: { role: true },
  });
  return participant?.role === GameParticipantRole.ORGANIZER;
}

export async function canManageGame(
  user: SessionUser,
  gameId: string,
): Promise<boolean> {
  if (isAdmin(user.role)) return true;
  return isGameOrganizer(user.id, gameId);
}

export async function requireGameOrganizerOrPlatformAdmin(gameId: string) {
  const session = await requireAuth();
  if (await canManageGame(session, gameId)) return session;
  throw new Error("FORBIDDEN");
}

export async function revalidateGamePaths(gameId: string) {
  const { revalidatePath } = await import("next/cache");
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { slug: true },
  });
  if (!game) return;

  const base = gamePath(game.slug);
  revalidatePath(base);
  revalidatePath(gamePath(game.slug, "predictions"));
  revalidatePath(gamePath(game.slug, "leaderboard"));
  revalidatePath(gamePath(game.slug, "live"));
}
