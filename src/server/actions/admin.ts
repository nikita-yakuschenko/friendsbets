"use server";

import { revalidatePath } from "next/cache";
import { MatchStatus, GameParticipantRole, UserRole } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { isGameOrganizer, revalidateGamePaths, resolveGameIdFromRoute } from "@/lib/game-access";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { deriveWinnerTeamId } from "@/lib/utils";
import type { ActionResult } from "@/server/actions/auth";
import { recalculateMatchScoresAction } from "@/server/actions/games";
import { syncMatches } from "@/lib/football-api/sync";

export async function updateMatchResultAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();

  const matchId = String(formData.get("matchId") ?? "");
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const gameId = String(formData.get("gameId") ?? "");

  if (!matchId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return { error: "Некорректные данные." };
  }

  if (!gameId) {
    return { error: "Игра не указана." };
  }

  const allowed =
    isAdmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) {
    return { error: "Нет доступа." };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Матч не найден." };

  const winnerTeamId = deriveWinnerTeamId(
    homeScore,
    awayScore,
    match.homeTeamId,
    match.awayTeamId,
  );

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      winnerTeamId,
      status: MatchStatus.FINISHED,
    },
  });

  if (gameId) {
    await recalculateMatchScoresAction(gameId, matchId);
  }

  revalidatePath("/admin");
  if (gameId) {
    await revalidateGamePaths(gameId);
  }

  return { success: true };
}

export async function syncChampionatMatchesAction(): Promise<
  ActionResult & {
    created?: number;
    updated?: number;
    teamsCreated?: number;
    teamsUpdated?: number;
    venuesUpdated?: number;
    total?: number;
  }
> {
  const session = await requireAuth();
  if (!isAdmin(session.role)) {
    const games = await getMissingPredictionsGames(session.id, session.role);
    if (games.length === 0) {
      return { error: "Нет доступа." };
    }
  }

  try {
    const result = await syncMatches();
    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось синхронизировать матчи.";
    return { error: message };
  }
}

export async function getAdminDashboardData(userId: string, role: UserRole) {
  const manageableGames = await getMissingPredictionsGames(userId, role);
  if (manageableGames.length === 0) {
    throw new Error("FORBIDDEN");
  }

  const gameFilter = isAdmin(role)
    ? {}
    : { id: { in: manageableGames.map((game) => game.id) } };

  const games = await prisma.game.findMany({
    where: gameFilter,
    include: { tournament: true, scoringRule: true },
    orderBy: { createdAt: "desc" },
  });

  const tournamentIds = [...new Set(games.map((game) => game.tournamentId))];

  const [tournaments, matches] = await Promise.all([
    prisma.tournament.findMany({
      where: isAdmin(role) ? {} : { id: { in: tournamentIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.findMany({
      where: { tournamentId: { in: tournamentIds } },
      include: { homeTeam: true, awayTeam: true, tournament: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return { tournaments, games, matches };
}

export async function recalculateAllScoresAction(
  gameId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const allowed =
    isAdmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) {
    return { error: "Нет доступа." };
  }

  const games = await prisma.game.findMany({ where: { id: gameId } });
  if (!games.length) return { error: "Игра не найдена." };

  const finishedMatches = await prisma.match.findMany({
    where: {
      tournamentId: games[0].tournamentId,
      status: MatchStatus.FINISHED,
    },
  });

  for (const match of finishedMatches) {
    await recalculateMatchScoresAction(gameId, match.id);
  }

  revalidatePath("/admin");
  await revalidateGamePaths(gameId);

  return { success: true };
}

export async function getAdminMissingPredictions(routeParam: string) {
  const session = await requireAuth();
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return [];

  const allowed =
    isAdmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) return [];

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      participants: true,
      tournament: true,
    },
  });
  if (!game) return [];

  const upcomingMatches = await prisma.match.findMany({
    where: {
      tournamentId: game.tournamentId,
      startsAt: { gt: new Date() },
      status: MatchStatus.SCHEDULED,
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        where: { gameId },
        select: { userId: true },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  return upcomingMatches.filter(isMatchPredictable).map((match) => {
    const predictedUserIds = new Set(match.predictions.map((p) => p.userId));
    const missingParticipants = game.participants.filter(
      (participant) => !predictedUserIds.has(participant.userId),
    );

    return {
      match,
      missingParticipants,
      reminderText: `Не сделали прогноз на матч ${match.homeTeam.name} — ${match.awayTeam.name}: ${missingParticipants.map((p) => p.displayName).join(", ") || "все сделали"}`,
    };
  });
}

export async function getMissingPredictionsGames(userId: string, role: UserRole) {
  if (isAdmin(role)) {
    return prisma.game.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true },
    });
  }

  return prisma.game.findMany({
    where: {
      participants: {
        some: { userId, role: GameParticipantRole.ORGANIZER },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true },
  });
}
