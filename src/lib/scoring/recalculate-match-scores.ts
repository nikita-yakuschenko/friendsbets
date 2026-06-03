import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { calculatePredictionScore } from "@/lib/scoring";

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

  const predictions = await prisma.prediction.findMany({
    where: { gameId, matchId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.predictionScore.deleteMany({
      where: { predictionId: { in: predictions.map((p) => p.id) } },
    });

    for (const prediction of predictions) {
      const result = calculatePredictionScore(
        prediction,
        match,
        game.scoringRule,
      );
      await tx.predictionScore.create({
        data: {
          predictionId: prediction.id,
          points: result.points,
          reason: result.reason,
        },
      });
    }
  });
}
