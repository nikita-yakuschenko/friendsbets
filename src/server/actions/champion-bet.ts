"use server";

import { requireAuth } from "@/lib/auth";
import {
  assertGameParticipant,
  isGameOrganizer,
  revalidateGamePaths,
  resolveGameIdFromRoute,
} from "@/lib/game-access";
import {
  getFirstPlayoffMatchStart,
  getPlayoffTeams,
  isPlayoffStarted,
} from "@/lib/champion-bet";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export async function saveChampionBetAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const gameId = String(formData.get("gameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");

  if (!gameId || !teamId) {
    return { error: "Некорректные данные формы." };
  }

  try {
    await assertGameParticipant(session, gameId);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "Вы не участник этого турнира." };
    }
    throw error;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      championBetEnabled: true,
      tournamentId: true,
    },
  });

  if (!game?.championBetEnabled) {
    return { error: "Ставка на чемпиона в этом турнире не включена." };
  }

  const firstPlayoff = await getFirstPlayoffMatchStart(game.tournamentId);
  if (isPlayoffStarted(firstPlayoff)) {
    return { error: "Плей-офф уже начался — изменить ставку нельзя." };
  }

  const playoffTeams = await getPlayoffTeams(game.tournamentId);
  if (!playoffTeams.some((team) => team.id === teamId)) {
    return { error: "Эта команда недоступна для ставки на чемпиона." };
  }

  await prisma.bonusPrediction.upsert({
    where: {
      gameId_userId: { gameId, userId: session.id },
    },
    create: {
      gameId,
      userId: session.id,
      teamId,
    },
    update: {
      teamId,
    },
  });

  await revalidateGamePaths(gameId);
  return { success: true };
}

export async function getChampionBetOrganizerData(routeParam: string) {
  const session = await requireAuth();
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return null;

  if (!(await isGameOrganizer(session.id, gameId))) {
    return null;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      participants: { orderBy: { displayName: "asc" } },
      bonusPredictions: { include: { team: true } },
    },
  });
  if (!game) return null;

  const firstPlayoffStart = await getFirstPlayoffMatchStart(game.tournamentId);
  const playoffStarted = isPlayoffStarted(firstPlayoffStart);
  const pickedUserIds = new Set(game.bonusPredictions.map((row) => row.userId));

  const missingParticipants = game.participants.filter(
    (participant) => !pickedUserIds.has(participant.userId),
  );

  return {
    game: {
      id: game.id,
      inviteCode: game.inviteCode,
      championBetEnabled: game.championBetEnabled,
      championBetPoints: game.championBetPoints,
    },
    firstPlayoffStart,
    playoffStarted,
    missingParticipants,
    picks: game.bonusPredictions.map((row) => ({
      userId: row.userId,
      displayName:
        game.participants.find((p) => p.userId === row.userId)?.displayName ??
        "Участник",
      teamName: row.team.name,
      teamCountryCode: row.team.countryCode,
    })),
  };
}

export async function getChampionBetParticipantData(
  routeParam: string,
  userId: string,
) {
  const session = await requireAuth();
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return null;

  try {
    await assertGameParticipant(session, gameId);
  } catch {
    return null;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      championBetEnabled: true,
      championBetPoints: true,
      tournamentId: true,
    },
  });
  if (!game || !game.championBetEnabled) return null;

  const [firstPlayoffStart, playoffTeams, myPick] = await Promise.all([
    getFirstPlayoffMatchStart(game.tournamentId),
    getPlayoffTeams(game.tournamentId),
    prisma.bonusPrediction.findUnique({
      where: { gameId_userId: { gameId, userId } },
      include: { team: true },
    }),
  ]);

  const locked = isPlayoffStarted(firstPlayoffStart);

  return {
    gameId: game.id,
    points: game.championBetPoints,
    firstPlayoffStart,
    locked,
    teams: playoffTeams,
    myPick: myPick
      ? {
          teamId: myPick.teamId,
          teamName: myPick.team.name,
          countryCode: myPick.team.countryCode,
        }
      : null,
  };
}
