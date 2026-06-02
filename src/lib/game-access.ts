import { GameParticipantRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { findGameByInviteCode } from "@/lib/game-invite";
import { gamePath, gameRouteSegmentFromPathname } from "@/lib/game-path";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import { isSuperadmin } from "@/lib/roles";
import type { SessionUser } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";

export { gamePath };

export function normalizeGameRouteParam(routeParam: string): string {
  try {
    return decodeURIComponent(routeParam).trim();
  } catch {
    return routeParam.trim();
  }
}

export function isCanonicalGameRoute(routeParam: string, inviteCode: string): boolean {
  return normalizeInviteCodeInput(normalizeGameRouteParam(routeParam)) === inviteCode;
}

export async function resolveGameIdFromRoute(routeParam: string): Promise<string | null> {
  const raw = normalizeGameRouteParam(routeParam);

  const byInvite = await findGameByInviteCode(raw);
  if (byInvite) return byInvite.id;

  const bySlug = await prisma.game.findUnique({
    where: { slug: raw },
    select: { id: true },
  });
  if (bySlug) return bySlug.id;

  const byId = await prisma.game.findUnique({
    where: { id: raw },
    select: { id: true },
  });
  return byId?.id ?? null;
}

export async function getGameBySlug(slug: string) {
  return prisma.game.findUnique({ where: { slug } });
}

export async function isGameParticipant(
  userId: string,
  gameId: string,
): Promise<boolean> {
  const row = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
    select: { id: true },
  });
  return row !== null;
}

export type GameViewAccess =
  | { status: "not_found" }
  | { status: "need_join"; game: { id: string; inviteCode: string } }
  | {
      status: "ok";
      game: { id: string; inviteCode: string; title: string };
      canPredict: boolean;
      isPlatformOversight: boolean;
    };

/** Просмотр турнира: участник или суперадмин (надзор без прогнозов). */
export async function resolveGameViewAccess(
  user: SessionUser,
  gameId: string,
  options?: { platformView?: boolean },
): Promise<GameViewAccess> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, inviteCode: true, title: true },
  });

  if (!game) return { status: "not_found" };

  const participant = await isGameParticipant(user.id, gameId);
  const platformView =
    isSuperadmin(user.role) && (options?.platformView === true || !participant);

  if (platformView) {
    return {
      status: "ok",
      game,
      canPredict: false,
      isPlatformOversight: true,
    };
  }

  if (participant) {
    return {
      status: "ok",
      game,
      canPredict: true,
      isPlatformOversight: false,
    };
  }

  if (isSuperadmin(user.role)) {
    return {
      status: "ok",
      game,
      canPredict: false,
      isPlatformOversight: true,
    };
  }

  return { status: "need_join", game };
}

/** Участие в турнире обязательно для прогнозов. Суперадмин без записи участника — нельзя. */
export async function assertGameParticipant(
  user: SessionUser,
  gameId: string,
) {
  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId: user.id } },
    include: { game: true },
  });

  if (!participant) {
    const exists = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });
    if (!exists) throw new Error("GAME_NOT_FOUND");
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

export async function getUserGamesState(userId: string) {
  const memberships = await getUserGames(userId);
  return {
    hasGames: memberships.length > 0,
    firstInviteCode: memberships[0]?.game.inviteCode,
  };
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

export async function requireGameViewByRoute(
  routeParam: string,
  platformView = false,
) {
  const session = await requireAuth();
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return null;

  const access = await resolveGameViewAccess(session, gameId, { platformView });
  if (access.status !== "ok") return null;

  return { session, gameId, access };
}

export async function canManageGame(
  user: SessionUser,
  gameId: string,
): Promise<boolean> {
  if (isSuperadmin(user.role)) return true;
  return isGameOrganizer(user.id, gameId);
}

export async function requireGameOrganizerOrPlatformAdmin(gameId: string) {
  const session = await requireAuth();
  if (await canManageGame(session, gameId)) return session;
  throw new Error("FORBIDDEN");
}

export async function redirectToCanonicalGameRoute(
  routeParam: string,
  inviteCode: string,
  pathname: string,
): Promise<void> {
  if (isCanonicalGameRoute(routeParam, inviteCode)) return;

  const { redirect } = await import("next/navigation");
  const segment = gameRouteSegmentFromPathname(pathname);
  redirect(segment ? gamePath(inviteCode, segment) : gamePath(inviteCode));
}

export async function revalidateGamePaths(gameId: string) {
  const { revalidatePath } = await import("next/cache");
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { inviteCode: true },
  });
  if (!game) return;

  const paths = [
    gamePath(game.inviteCode),
    gamePath(game.inviteCode, "predictions"),
    gamePath(game.inviteCode, "control"),
    gamePath(game.inviteCode, "leaderboard"),
    gamePath(game.inviteCode, "live"),
    gamePath(game.inviteCode, "more"),
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}
