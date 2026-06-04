import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Турнир считается начавшимся, если есть live/завершённый матч или запланированный уже стартовал. */
export async function isGameTournamentStarted(gameId: string): Promise<boolean> {
  const map = await getGameTournamentStartedMap([gameId]);
  return map.get(gameId) ?? false;
}

export async function getGameTournamentStartedMap(
  gameIds: string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (gameIds.length === 0) return result;

  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    select: { id: true, tournamentId: true },
  });

  const tournamentIds = [...new Set(games.map((g) => g.tournamentId))];
  const now = new Date();

  const startedRows = await prisma.match.findMany({
    where: {
      tournamentId: { in: tournamentIds },
      OR: [
        { status: { in: [MatchStatus.LIVE, MatchStatus.FINISHED] } },
        { status: MatchStatus.SCHEDULED, startsAt: { lte: now } },
      ],
    },
    select: { tournamentId: true },
    distinct: ["tournamentId"],
  });

  const startedTournamentIds = new Set(
    startedRows.map((row) => row.tournamentId),
  );

  for (const game of games) {
    result.set(game.id, startedTournamentIds.has(game.tournamentId));
  }

  return result;
}
