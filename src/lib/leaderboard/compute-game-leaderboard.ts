import { prisma } from "@/lib/db";

export type GameLeaderboardRow = {
  userId: string;
  displayName: string;
  totalPoints: number;
  rank: number;
};

export async function computeGameLeaderboard(
  gameId: string,
): Promise<GameLeaderboardRow[]> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              predictions: {
                where: { gameId },
                include: { scores: true },
              },
            },
          },
        },
      },
    },
  });

  if (!game) return [];

  return game.participants
    .map((participant) => ({
      userId: participant.userId,
      displayName: participant.displayName,
      totalPoints: participant.user.predictions.reduce(
        (sum, prediction) =>
          sum + prediction.scores.reduce((acc, score) => acc + score.points, 0),
        0,
      ),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
