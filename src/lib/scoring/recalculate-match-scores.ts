import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { calculatePredictionScore } from "@/lib/scoring";

/** Пересчёт очков по всем завершённым матчам одной игры. */
export async function recalculateAllGamePredictionScores(
  gameId: string,
): Promise<number> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { tournamentId: true },
  });
  if (!game) return 0;

  const finishedMatches = await prisma.match.findMany({
    where: {
      tournamentId: game.tournamentId,
      status: MatchStatus.FINISHED,
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { id: true },
  });

  for (const match of finishedMatches) {
    await persistMatchPredictionScores(gameId, match.id);
  }

  return finishedMatches.length;
}

/** Записывает очки прогнозов в БД (без проверки сессии — для cron/sync). */
export async function persistMatchPredictionScores(
  gameId: string,
  matchId: string,
): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { scoringRule: true },
  });
  if (!game) return;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== MatchStatus.FINISHED) return;
  if (match.homeScore === null || match.awayScore === null) return;

  const scoringOptions = {
    penaltyScoringSynthetic: game.penaltyScoringSynthetic,
  };

  const predictions = await prisma.prediction.findMany({
    where: { gameId, matchId },
  });

  await prisma.$transaction(async (tx) => {
    for (const prediction of predictions) {
      const result = calculatePredictionScore(
        prediction,
        match,
        game.scoringRule,
        scoringOptions,
      );
      await tx.predictionScore.upsert({
        where: { predictionId: prediction.id },
        create: {
          predictionId: prediction.id,
          points: result.points,
          reason: result.reason,
        },
        update: {
          points: result.points,
          reason: result.reason,
          calculatedAt: new Date(),
        },
      });
    }
  });
}
