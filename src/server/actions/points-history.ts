"use server";

import { MatchStatus } from "@/generated/prisma/client";
import { requireGameViewByRoute } from "@/lib/game-access";
import {
  buildPointsHistoryEntries,
  resolveChampionAwardedAt,
  type PointsHistoryEntry,
} from "@/lib/leaderboard/points-history";
import { prisma } from "@/lib/db";

export type PointsHistoryPayload = {
  displayName: string;
  entries: PointsHistoryEntry[];
  totalPoints: number;
};

export async function getParticipantPointsHistory(
  routeParam: string,
  targetUserId: string,
  platformView = false,
): Promise<PointsHistoryPayload | null> {
  const view = await requireGameViewByRoute(routeParam, platformView);
  if (!view) return null;

  const { gameId } = view;

  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId: targetUserId } },
    select: { displayName: true },
  });
  if (!participant) return null;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { tournamentId: true },
  });
  if (!game) return null;

  const [predictions, championPick, finishedKnockout] = await Promise.all([
    prisma.prediction.findMany({
      where: { gameId, userId: targetUserId },
      include: {
        scores: true,
        match: {
          include: {
            homeTeam: { select: { name: true, countryCode: true } },
            awayTeam: { select: { name: true, countryCode: true } },
          },
        },
      },
    }),
    prisma.bonusPrediction.findFirst({
      where: { gameId, userId: targetUserId, points: { gt: 0 } },
      include: { team: { select: { name: true, countryCode: true } } },
    }),
    prisma.match.findMany({
      where: {
        tournamentId: game.tournamentId,
        status: MatchStatus.FINISHED,
      },
      select: {
        stage: true,
        startsAt: true,
        championatFinishedAt: true,
      },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  const entries = buildPointsHistoryEntries({
    predictions,
    championPick: championPick,
    championAwardedAt: resolveChampionAwardedAt(finishedKnockout),
  });

  const totalPoints = entries.reduce((sum, entry) => sum + entry.points, 0);

  return {
    displayName: participant.displayName,
    entries,
    totalPoints,
  };
}
