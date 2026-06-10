import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  isPlaceholderTeamExternalId,
} from "@/lib/football-api/match-visibility";
import { isKnockoutStage } from "@/lib/match-stage";

export type PlayoffTeam = {
  id: string;
  name: string;
  countryCode: string | null;
};

export async function getFirstPlayoffMatchStart(
  tournamentId: string,
): Promise<Date | null> {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: { not: MatchStatus.CANCELLED },
    },
    select: { stage: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  });

  const first = matches.find((match) => isKnockoutStage(match.stage));
  return first?.startsAt ?? null;
}

export function isPlayoffStarted(
  firstPlayoffStart: Date | null,
  now = new Date(),
): boolean {
  if (!firstPlayoffStart) return false;
  return firstPlayoffStart.getTime() <= now.getTime();
}

export async function getPlayoffTeams(
  tournamentId: string,
): Promise<PlayoffTeam[]> {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { startsAt: "asc" },
  });

  const byId = new Map<string, PlayoffTeam>();

  for (const match of matches) {
    if (!isKnockoutStage(match.stage)) continue;

    for (const team of [match.homeTeam, match.awayTeam]) {
      if (isPlaceholderTeamExternalId(team.externalId)) continue;
      byId.set(team.id, {
        id: team.id,
        name: team.name,
        countryCode: team.countryCode,
      });
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

/** Победитель турнира — команда из финала или последнего завершённого матча плей-офф. */
export async function getTournamentChampionTeamId(
  tournamentId: string,
): Promise<string | null> {
  const finalMatch = await prisma.match.findFirst({
    where: {
      tournamentId,
      status: MatchStatus.FINISHED,
      winnerTeamId: { not: null },
      stage: { contains: "инал", mode: "insensitive" },
    },
    orderBy: { startsAt: "desc" },
    select: { winnerTeamId: true },
  });
  if (finalMatch?.winnerTeamId) return finalMatch.winnerTeamId;

  const knockoutMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: MatchStatus.FINISHED,
      winnerTeamId: { not: null },
    },
    select: { stage: true, startsAt: true, winnerTeamId: true },
    orderBy: { startsAt: "desc" },
  });

  const lastKnockout = knockoutMatches.find((match) =>
    isKnockoutStage(match.stage),
  );
  return lastKnockout?.winnerTeamId ?? null;
}

export async function syncChampionBetPoints(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      championBetEnabled: true,
      championBetPoints: true,
      tournamentId: true,
    },
  });

  if (!game?.championBetEnabled || game.championBetPoints == null) return;

  const championTeamId = await getTournamentChampionTeamId(game.tournamentId);
  if (!championTeamId) return;

  const award = game.championBetPoints;
  const predictions = await prisma.bonusPrediction.findMany({
    where: { gameId },
    select: { id: true, teamId: true, points: true },
  });

  for (const prediction of predictions) {
    const nextPoints = prediction.teamId === championTeamId ? award : 0;
    if (prediction.points !== nextPoints) {
      await prisma.bonusPrediction.update({
        where: { id: prediction.id },
        data: { points: nextPoints },
      });
    }
  }
}
