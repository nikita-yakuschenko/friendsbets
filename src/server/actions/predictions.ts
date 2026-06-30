"use server";

import { MatchStatus } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  assertGameParticipant,
  revalidateGamePaths,
  requireGameViewByRoute,
  resolveGameIdFromRoute,
} from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import {
  isMatchInProgress,
  isMatchLockedForPredictions,
  isMatchPostponed,
  isMatchStaleAwaitingResult,
} from "@/lib/match-prediction-state";
import { isKnockoutStage } from "@/lib/match-stage";
import { deriveWinnerTeamId } from "@/lib/utils";
import type { PredictionMatchItem } from "@/lib/predictions-list";
import { buildPredictionStageGroups } from "@/lib/predictions-list";
import { buildSyntheticRegulationScore } from "@/lib/scoring/penalty-scoring-mode";
import {
  pickCanonicalPredictionScore,
  sumPredictionScorePoints,
} from "@/lib/scoring/prediction-score-record";
import { persistMatchPredictionScores } from "@/lib/scoring/recalculate-match-scores";
import type { ActionResult } from "@/server/actions/auth";

async function repairMissingPredictionScores(params: {
  gameId: string;
  matches: Array<{
    id: string;
    status: MatchStatus | string;
    homeScore: number | null;
    awayScore: number | null;
  }>;
  predictions: Array<{
    matchId: string;
    scores: unknown[];
  }>;
}): Promise<boolean> {
  const finishedMatchIds = new Set(
    params.matches
      .filter(
        (match) =>
          match.status === MatchStatus.FINISHED &&
          match.homeScore !== null &&
          match.awayScore !== null,
      )
      .map((match) => match.id),
  );

  const matchIdsToRepair = new Set(
    params.predictions
      .filter(
        (prediction) =>
          finishedMatchIds.has(prediction.matchId) &&
          prediction.scores.length === 0,
      )
      .map((prediction) => prediction.matchId),
  );

  for (const matchId of matchIdsToRepair) {
    await persistMatchPredictionScores(params.gameId, matchId);
  }

  return matchIdsToRepair.size > 0;
}

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

  if (isKnockoutStage(match.stage) && homeScore === awayScore) {
    return { error: "В плей-офф ничья невозможна — укажите победителя." };
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

  // Счёт и статусы матчей — только из БД. Обновление с Championat: /api/cron/sync-matches.
  const matches = await prisma.match.findMany({
    where: { tournamentId: game.tournamentId },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { startsAt: "asc" },
  });

  let predictions = await prisma.prediction.findMany({
    where: { gameId, userId },
    include: { scores: true },
  });

  const repaired = await repairMissingPredictionScores({
    gameId,
    matches,
    predictions,
  });
  if (repaired) {
    predictions = await prisma.prediction.findMany({
      where: { gameId, userId },
      include: { scores: true },
    });
  }

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
      points: saved ? sumPredictionScorePoints(saved.scores) : 0,
      scoreReason: pickCanonicalPredictionScore(saved?.scores ?? [])?.reason ?? null,
    };
  });

  return {
    game,
    items,
    stageGroups: buildPredictionStageGroups(items),
  };
}

export type MatchPredictionsSummaryRow = {
  userId: string;
  displayName: string;
  homeScore: number | null;
  awayScore: number | null;
  points: number | null;
  scoreReason: string | null;
  isCurrentUser: boolean;
};

export type MatchPredictionsSummaryPayload = {
  homeTeamName: string;
  awayTeamName: string;
  actualHome: number | null;
  actualAway: number | null;
  actualHomePenaltyScore: number | null;
  actualAwayPenaltyScore: number | null;
  penaltyScoringSynthetic: boolean;
  scoringHome: number | null;
  scoringAway: number | null;
  resultPending: boolean;
  rows: MatchPredictionsSummaryRow[];
};

export async function getMatchPredictionsSummary(
  routeParam: string,
  matchId: string,
  platformView = false,
): Promise<MatchPredictionsSummaryPayload | null> {
  const view = await requireGameViewByRoute(routeParam, platformView);
  if (!view) return null;

  const { session, gameId } = view;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { tournamentId: true, penaltyScoringSynthetic: true },
  });
  if (!game) return null;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      tournamentId: true,
      status: true,
      startsAt: true,
      homeScore: true,
      awayScore: true,
      homePenaltyScore: true,
      awayPenaltyScore: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });
  if (!match || match.tournamentId !== game.tournamentId) return null;

  const finished =
    match.status === MatchStatus.FINISHED ||
    isMatchStaleAwaitingResult(match);
  if (!finished) return null;

  const hasOfficialScore =
    match.homeScore !== null && match.awayScore !== null;
  const resultPending =
    match.status !== MatchStatus.FINISHED || !hasOfficialScore;

  const [participants, initialPredictions] = await Promise.all([
    prisma.gameParticipant.findMany({
      where: { gameId },
      select: { userId: true, displayName: true },
    }),
    prisma.prediction.findMany({
      where: { gameId, matchId },
      include: { scores: true },
    }),
  ]);
  let predictions = initialPredictions;

  if (
    !resultPending &&
    (await repairMissingPredictionScores({
      gameId,
      matches: [{ id: matchId, ...match }],
      predictions,
    }))
  ) {
    predictions = await prisma.prediction.findMany({
      where: { gameId, matchId },
      include: { scores: true },
    });
  }

  const predictionByUserId = new Map(
    predictions.map((prediction) => [prediction.userId, prediction]),
  );

  const rows: MatchPredictionsSummaryRow[] = participants.map(
    (participant) => {
      const prediction = predictionByUserId.get(participant.userId);
      const points = resultPending
        ? null
        : prediction
          ? sumPredictionScorePoints(prediction.scores)
          : 0;

      return {
        userId: participant.userId,
        displayName: participant.displayName,
        homeScore: prediction?.homeScore ?? null,
        awayScore: prediction?.awayScore ?? null,
        points,
        scoreReason:
          pickCanonicalPredictionScore(prediction?.scores ?? [])?.reason ?? null,
        isCurrentUser: participant.userId === session.id,
      };
    },
  );

  rows.sort((a, b) => {
    const aHas = a.homeScore != null && a.awayScore != null;
    const bHas = b.homeScore != null && b.awayScore != null;
    if (aHas !== bHas) return aHas ? -1 : 1;

    const aPoints = a.points ?? -1;
    const bPoints = b.points ?? -1;
    if (aPoints !== bPoints) return bPoints - aPoints;

    return a.displayName.localeCompare(b.displayName, "ru");
  });

  const synthetic =
    game.penaltyScoringSynthetic &&
    match.homeScore != null &&
    match.awayScore != null
      ? buildSyntheticRegulationScore(match)
      : null;

  return {
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    actualHome: match.homeScore,
    actualAway: match.awayScore,
    actualHomePenaltyScore: match.homePenaltyScore,
    actualAwayPenaltyScore: match.awayPenaltyScore,
    penaltyScoringSynthetic: game.penaltyScoringSynthetic,
    scoringHome: synthetic?.homeScore ?? null,
    scoringAway: synthetic?.awayScore ?? null,
    resultPending,
    rows,
  };
}
