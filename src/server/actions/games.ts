"use server";

import { MatchStatus } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  canManageGame,
  isGameOrganizer,
  isGameParticipant,
  requireGameViewByRoute,
  resolveGameIdFromRoute,
} from "@/lib/game-access";
import { isSuperadmin } from "@/lib/roles";
import { prisma } from "@/lib/db";
import {
  findNextNotStartedMatches,
  isMatchPredictable,
} from "@/lib/football-api/match-visibility";
import { syncChampionBetPoints } from "@/lib/champion-bet";
import { getChampionBetCountryByUserId } from "@/lib/champion-bet-display";
import { computeLivePredictionStats } from "@/lib/live-match-stats";
import { buildPredictionStatsCommentary } from "@/lib/prediction-stats-commentary";
import {
  isMatchInProgress,
  MATCH_LIVE_TRACKING_MAX_MS,
} from "@/lib/match-prediction-state";
import { calculatePredictionScore } from "@/lib/scoring";
import { sumPredictionScorePoints } from "@/lib/scoring/prediction-score-record";
import { persistMatchPredictionScores } from "@/lib/scoring/recalculate-match-scores";
import { getLeaderboardColumns } from "@/lib/scoring/catalog";
import type { ScoreTier } from "@/lib/scoring/rules";
import type { ActionResult } from "@/server/actions/auth";

export async function getGameOversightOverview(
  routeParam: string,
  platformView = false,
) {
  const view = await requireGameViewByRoute(routeParam, platformView);
  if (!view) return null;
  if (
    !view.access.isPlatformOversight &&
    !(await canManageGame(view.session, view.gameId))
  ) {
    return null;
  }

  const game = await prisma.game.findUnique({
    where: { id: view.gameId },
    include: {
      tournament: true,
      scoringRule: true,
      createdBy: { select: { name: true, email: true } },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              avatarUrl: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!game) return null;

  return {
    game,
    participants: game.participants,
    isPlatformOversight: view.access.isPlatformOversight,
    usePlatformTabLinks:
      platformView || view.access.isPlatformOversight,
  };
}

export async function getGameOverview(routeParam: string, userId: string) {
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return null;

  if (!(await isGameParticipant(userId, gameId))) {
    return null;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      tournament: true,
      scoringRule: true,
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

  if (!game) return null;

  await syncChampionBetPoints(gameId);

  const bonusRows = await prisma.bonusPrediction.findMany({
    where: { gameId },
    select: { userId: true, points: true },
  });
  const bonusPointsByUserId = new Map(
    bonusRows.map((row) => [row.userId, row.points]),
  );

  const championBetCountryByUserId = await getChampionBetCountryByUserId(gameId);

  const matches = await prisma.match.findMany({
    where: { tournamentId: game.tournamentId },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { startsAt: "asc" },
  });

  const myPredictions = await prisma.prediction.findMany({
    where: { gameId, userId },
    include: { scores: true },
  });

  const leaderboard = game.participants
    .map((participant) => {
      const matchPoints = participant.user.predictions.reduce(
        (sum, prediction) =>
          sum + sumPredictionScorePoints(prediction.scores),
        0,
      );
      const totalPoints =
        matchPoints + (bonusPointsByUserId.get(participant.userId) ?? 0);
      return {
        userId: participant.userId,
        displayName: participant.displayName,
        championBetCountryCode:
          championBetCountryByUserId.get(participant.userId) ?? null,
        totalPoints,
        predictionsCount: participant.user.predictions.length,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const topLeaderboard = leaderboard.slice(0, 5).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  const myIndex = leaderboard.findIndex((row) => row.userId === userId);
  const myRow = myIndex >= 0 ? leaderboard[myIndex] : null;
  const leader = leaderboard[0] ?? null;

  const now = new Date();
  const predictableMatches = matches.filter((match) => isMatchPredictable(match));
  const upcomingMatches = predictableMatches
    .filter(
      (match) =>
        match.status === MatchStatus.SCHEDULED &&
        match.startsAt.getTime() > now.getTime(),
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const nextMatches = findNextNotStartedMatches(predictableMatches, now);
  const nextMatch = nextMatches[0] ?? null;
  const nextMatchPrediction = nextMatch
    ? (myPredictions.find((prediction) => prediction.matchId === nextMatch.id) ?? null)
    : null;
  const nextMatchItems = nextMatches.map((match) => {
    const prediction =
      myPredictions.find((row) => row.matchId === match.id) ?? null;
    return {
      match,
      hasPrediction: Boolean(prediction),
      prediction: prediction
        ? {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          }
        : null,
    };
  });

  const missingPredictionsCount = upcomingMatches.filter(
    (match) => !myPredictions.some((prediction) => prediction.matchId === match.id),
  ).length;

  return {
    game,
    matches,
    myRow,
    myRank: myIndex >= 0 ? myIndex + 1 : null,
    leader,
    isLeader: leader?.userId === userId,
    nextMatch,
    nextMatches: nextMatchItems,
    nextMatchHasPrediction: Boolean(nextMatchPrediction),
    nextMatchPrediction: nextMatchPrediction
      ? {
          homeScore: nextMatchPrediction.homeScore,
          awayScore: nextMatchPrediction.awayScore,
        }
      : null,
    missingPredictionsCount,
    participantsCount: game.participants.length,
    topLeaderboard,
  };
}

export async function getLeaderboardData(routeParam: string) {
  const view = await requireGameViewByRoute(routeParam);
  if (!view) return null;

  const { gameId } = view;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      scoringRule: true,
      participants: {
        include: {
          user: {
            select: {
              id: true,
              avatarUrl: true,
              updatedAt: true,
              predictions: {
                where: { gameId },
                include: {
                  scores: true,
                  match: true,
                },
              },
            },
          },
        },
      },
      tournament: {
        include: {
          matches: true,
        },
      },
    },
  });

  if (!game) return null;

  await syncChampionBetPoints(gameId);

  const bonusRows = await prisma.bonusPrediction.findMany({
    where: { gameId },
    select: { userId: true, points: true },
  });
  const bonusPointsByUserId = new Map(
    bonusRows.map((row) => [row.userId, row.points]),
  );
  const championBetCountryByUserId = await getChampionBetCountryByUserId(gameId);

  const totalMatches = game.tournament.matches.length;
  const columns = getLeaderboardColumns(game.scoringRule.code);

  const rows = game.participants
    .map((participant) => {
      const predictions = participant.user.predictions;
      const matchPoints = predictions.reduce(
        (sum, prediction) =>
          sum + sumPredictionScorePoints(prediction.scores),
        0,
      );
      const totalPoints =
        matchPoints + (bonusPointsByUserId.get(participant.userId) ?? 0);

      const tierCounts = Object.fromEntries(
        columns.map((column) => [column.tier, 0]),
      ) as Record<ScoreTier, number>;

      for (const prediction of predictions) {
        const result = calculatePredictionScore(
          prediction,
          prediction.match,
          game.scoringRule,
          { penaltyScoringSynthetic: game.penaltyScoringSynthetic },
        );
        if (result.tier !== "none" && result.tier in tierCounts) {
          tierCounts[result.tier]++;
        }
      }

      return {
        userId: participant.userId,
        displayName: participant.displayName,
        avatarUrl: participant.user.avatarUrl,
        updatedAt: participant.user.updatedAt,
        championBetCountryCode:
          championBetCountryByUserId.get(participant.userId) ?? null,
        totalPoints,
        predictionsCount: predictions.length,
        totalMatches,
        tierCounts,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    scoringRuleTitle: game.scoringRule.title,
    scoringRuleCode: game.scoringRule.code,
    penaltyScoringSynthetic: game.penaltyScoringSynthetic,
    columns,
    rows,
  };
}

export type LiveMatchItem = Awaited<ReturnType<typeof getLiveMatches>>[number];

export async function getLiveMatches(routeParam: string) {
  const view = await requireGameViewByRoute(routeParam);
  if (!view) return [];

  const { session, gameId, access } = view;
  const oversight = access.isPlatformOversight;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { tournament: true },
  });
  if (!game) return [];

  const now = new Date();
  const liveSince = new Date(now.getTime() - MATCH_LIVE_TRACKING_MAX_MS);

  const [matches, participants] = await Promise.all([
    prisma.match.findMany({
      where: {
        tournamentId: game.tournamentId,
        status: {
          in: [MatchStatus.LIVE, MatchStatus.SCHEDULED],
        },
        startsAt: { gte: liveSince },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          where: { gameId },
          select: {
            userId: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.gameParticipant.findMany({
      where: { gameId },
      select: { userId: true, displayName: true },
    }),
  ]);

  const displayNameByUserId = new Map(
    participants.map((participant) => [
      participant.userId,
      participant.displayName,
    ]),
  );

  const inProgress = matches
    .filter(isMatchPredictable)
    .filter((match) => isMatchInProgress(match))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  return inProgress.map((match) => {
    const myPrediction = oversight
      ? null
      : (match.predictions.find((prediction) => prediction.userId === session.id) ??
        null);

    const friendPredictions = oversight
      ? match.predictions.map((prediction) => ({
          userId: prediction.userId,
          displayName:
            displayNameByUserId.get(prediction.userId) ?? "Участник",
          hasPrediction: true as const,
        }))
      : match.predictions
          .filter((prediction) => prediction.userId !== session.id)
          .map((prediction) => ({
            userId: prediction.userId,
            displayName:
              displayNameByUserId.get(prediction.userId) ?? "Участник",
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"));

    const liveScore =
      match.homeScore != null && match.awayScore != null
        ? { home: match.homeScore, away: match.awayScore }
        : null;

    const stats = computeLivePredictionStats(match.predictions, liveScore);

    const statsComment = stats
      ? buildPredictionStatsCommentary({
          stats,
          seed: match.id,
          homeTeam: {
            name: match.homeTeam.name,
            countryCode: match.homeTeam.countryCode,
          },
          awayTeam: {
            name: match.awayTeam.name,
            countryCode: match.awayTeam.countryCode,
          },
          predictions: match.predictions.map((prediction) => ({
            displayName:
              displayNameByUserId.get(prediction.userId) ?? "Участник",
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          })),
        })
      : null;

    return {
      match,
      myPrediction,
      friendPredictions,
      stats,
      statsComment,
    };
  });
}

export async function getLiveMatch(
  routeParam: string,
  matchId: string,
): Promise<LiveMatchItem | null> {
  const items = await getLiveMatches(routeParam);
  return items.find((item) => item.match.id === matchId) ?? null;
}

export async function recalculateMatchScoresAction(
  gameId: string,
  matchId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const allowed =
    isSuperadmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) {
    return { error: "Нет доступа." };
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { scoringRule: true },
  });
  if (!game) return { error: "Игра не найдена." };

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Матч не найден." };
  if (match.status !== MatchStatus.FINISHED) {
    return { error: "Матч ещё не завершён." };
  }

  await persistMatchPredictionScores(gameId, matchId);

  return { success: true };
}

export async function recalculateGameScoresAction(
  gameId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const allowed =
    isSuperadmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) {
    return { error: "Нет доступа." };
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { tournament: true },
  });
  if (!game) return { error: "Игра не найдена." };

  const finishedMatches = await prisma.match.findMany({
    where: {
      tournamentId: game.tournamentId,
      status: MatchStatus.FINISHED,
    },
  });

  for (const match of finishedMatches) {
    await recalculateMatchScoresAction(gameId, match.id);
  }

  return { success: true };
}
