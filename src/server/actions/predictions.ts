"use server";

import { requireAuth } from "@/lib/auth";
import {
  assertGameParticipant,
  revalidateGamePaths,
  resolveGameIdFromRoute,
} from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { deriveWinnerTeamId, isMatchLocked } from "@/lib/utils";
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

  await assertGameParticipant(session, gameId);

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

  if (isMatchLocked(match.startsAt)) {
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
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return null;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { tournament: true, scoringRule: true },
  });
  if (!game) return null;

  const matches = await prisma.match.findMany({
    where: { tournamentId: game.tournamentId },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const predictions = await prisma.prediction.findMany({
    where: { gameId, userId },
    include: { scores: true },
  });

  const predictionMap = new Map(predictions.map((p) => [p.matchId, p]));

  const items = matches.map((match) => ({
    match,
    canPredict: isMatchPredictable(match),
    prediction: predictionMap.get(match.id) ?? null,
    locked: isMatchLocked(match.startsAt),
    points:
      predictionMap.get(match.id)?.scores.reduce(
        (sum, score) => sum + score.points,
        0,
      ) ?? 0,
  }));

  const byStage = new Map<string, typeof items>();
  for (const item of items) {
    const stage = item.match.stage?.trim() || "Матч";
    const bucket = byStage.get(stage);
    if (bucket) bucket.push(item);
    else byStage.set(stage, [item]);
  }

  const stageGroups = [...byStage.entries()]
    .map(([stage, groupItems]) => {
      groupItems.sort(
        (a, b) =>
          new Date(a.match.startsAt).getTime() - new Date(b.match.startsAt).getTime(),
      );
      return {
        id: groupItems[0]!.match.id,
        stage,
        items: groupItems,
        sortAt: new Date(groupItems[0]!.match.startsAt).getTime(),
      };
    })
    .sort((a, b) => a.sortAt - b.sortAt)
    .map(({ id, stage, items: groupItems }) => ({ id, stage, items: groupItems }));

  return {
    game,
    items,
    stageGroups,
  };
}
