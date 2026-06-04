"use server";

import { requireAuth } from "@/lib/auth";
import {
  assertGameParticipant,
  revalidateGamePaths,
  resolveGameIdFromRoute,
} from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { runScheduledChampionatMatchSyncs } from "@/lib/football-api/championat/sync-scheduled-championat-matches";
import { resolveChampionatSourceForTournament } from "@/lib/football-api/championat/resolve-source";
import {
  isMatchInProgress,
  isMatchLockedForPredictions,
  isMatchPostponed,
  isMatchStaleAwaitingResult,
} from "@/lib/match-prediction-state";
import { deriveWinnerTeamId } from "@/lib/utils";
import type { PredictionMatchItem } from "@/lib/predictions-list";
import { buildPredictionStageGroups } from "@/lib/predictions-list";
import type { ActionResult } from "@/server/actions/auth";

export async function savePredictionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const gameId = String(formData.get("gameId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (!gameId || !matchId) {
    return { error: "Некорректные данные формы." };
  }

  if (
    Number.isNaN(homeScore) ||
    Number.isNaN(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return { error: "Введите корректный счёт." };
  }

  try {
    await assertGameParticipant(session, gameId);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return {
        error: "Вы не участник этого турнира. Подключитесь по invite-коду.",
      };
    }
    throw error;
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!match) {
    return { error: "Матч не найден." };
  }

  if (!isMatchPredictable(match)) {
    return { error: "Прогноз на этот матч пока недоступен." };
  }

  if (isMatchLockedForPredictions(match)) {
    return {
      error: "Прогноз нельзя изменить после начала матча.",
    };
  }

  const winnerTeamId = deriveWinnerTeamId(
    homeScore,
    awayScore,
    match.homeTeamId,
    match.awayTeamId,
  );

  await prisma.prediction.upsert({
    where: {
      gameId_matchId_userId: {
        gameId,
        matchId,
        userId: session.id,
      },
    },
    create: {
      gameId,
      matchId,
      userId: session.id,
      homeScore,
      awayScore,
      winnerTeamId,
    },
    update: {
      homeScore,
      awayScore,
      winnerTeamId,
      updatedAt: new Date(),
    },
  });

  await revalidateGamePaths(gameId);

  return { success: true };
}

export async function getPredictionsPageData(routeParam: string, userId: string) {
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
    include: { tournament: true, scoringRule: true },
  });
  if (!game) return null;

  const championatSource = await resolveChampionatSourceForTournament(
    game.tournamentId,
  );

  let matches = await prisma.match.findMany({
    where: { tournamentId: game.tournamentId },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { startsAt: "asc" },
  });

  if (championatSource) {
    try {
      await runScheduledChampionatMatchSyncs({
        tournamentId: game.tournamentId,
        maxPolls: 12,
      });
      matches = await prisma.match.findMany({
        where: { tournamentId: game.tournamentId },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { startsAt: "asc" },
      });
    } catch (err) {
      console.error("[predictions] championat scheduled sync failed", err);
    }
  }

  const predictions = await prisma.prediction.findMany({
    where: { gameId, userId },
    include: { scores: true },
  });

  const predictionMap = new Map(predictions.map((p) => [p.matchId, p]));

  const items: PredictionMatchItem[] = matches.map((match) => {
    const saved = predictionMap.get(match.id);
    return {
      match,
      canPredict: isMatchPredictable(match),
      prediction: saved
        ? { homeScore: saved.homeScore, awayScore: saved.awayScore }
        : null,
      locked: isMatchLockedForPredictions(match),
      postponed: isMatchPostponed(match),
      inProgress: isMatchInProgress(match),
      staleAwaitingResult: isMatchStaleAwaitingResult(match),
      points:
        saved?.scores.reduce((sum, score) => sum + score.points, 0) ?? 0,
      scoreReason: saved?.scores[0]?.reason ?? null,
    };
  });

  return {
    game,
    items,
    stageGroups: buildPredictionStageGroups(items),
  };
}
