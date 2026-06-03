import { GameParticipantRole, MatchStatus, UserRole } from "@/generated/prisma/client";
import { parseChampionatTournamentUrl } from "@/lib/championat-url";
import { prisma } from "@/lib/db";
import { isSuperadmin } from "@/lib/roles";
import { recalculateMatchScoresAction } from "@/server/actions/games";

export type AdminPlatformMatchRow = {
  id: string;
  status: string;
  startsAt: string;
  homeScore: number | null;
  awayScore: number | null;
  stage: string | null;
  homeTeamName: string;
  awayTeamName: string;
  templateTitle: string;
  templateId: string | null;
  tournamentId: string;
  linkedGamesCount: number;
};

export async function findTemplateForTournament(tournament: {
  externalId: string | null;
  title: string;
}) {
  if (!tournament.externalId) return null;

  const templates = await prisma.tournamentTemplate.findMany({
    select: { id: true, title: true, championatUrl: true, isSystem: true },
  });

  for (const template of templates) {
    const parsed = parseChampionatTournamentUrl(template.championatUrl);
    if (parsed?.tournamentExternalId === tournament.externalId) {
      return template;
    }
  }

  return null;
}

export async function userCanManageTournament(
  userId: string,
  role: UserRole,
  tournamentId: string,
): Promise<boolean> {
  if (isSuperadmin(role)) return true;

  const game = await prisma.game.findFirst({
    where: {
      tournamentId,
      participants: {
        some: { userId, role: GameParticipantRole.ORGANIZER },
      },
    },
    select: { id: true },
  });

  return game !== null;
}

export async function getGameIdsForTournament(tournamentId: string): Promise<string[]> {
  const games = await prisma.game.findMany({
    where: { tournamentId },
    select: { id: true },
  });
  return games.map((g) => g.id);
}

/** Пересчёт очков по матчу во всех играх, привязанных к календарю шаблона. */
export async function recalculateMatchScoresForTournament(
  tournamentId: string,
  matchId: string,
): Promise<void> {
  const gameIds = await getGameIdsForTournament(tournamentId);
  for (const gameId of gameIds) {
    await recalculateMatchScoresAction(gameId, matchId);
  }
}

/** Пересчёт всех завершённых матчей турнира во всех играх шаблона. */
export async function recalculateAllScoresForTournament(
  tournamentId: string,
): Promise<void> {
  const finishedMatches = await prisma.match.findMany({
    where: { tournamentId, status: MatchStatus.FINISHED },
    select: { id: true },
  });

  for (const match of finishedMatches) {
    await recalculateMatchScoresForTournament(tournamentId, match.id);
  }
}

export async function listAdminPlatformMatches(
  userId: string,
  role: UserRole,
): Promise<AdminPlatformMatchRow[]> {
  const isPlatformAdmin = isSuperadmin(role);

  let tournamentIds: string[];

  if (isPlatformAdmin) {
    const templates = await prisma.tournamentTemplate.findMany({
      select: { championatUrl: true },
    });
    const externalIds = templates
      .map((t) => parseChampionatTournamentUrl(t.championatUrl)?.tournamentExternalId)
      .filter((id): id is string => Boolean(id));

    const tournaments = await prisma.tournament.findMany({
      where: { externalId: { in: externalIds } },
      select: { id: true },
    });
    tournamentIds = tournaments.map((t) => t.id);
  } else {
    const games = await prisma.game.findMany({
      where: {
        participants: {
          some: { userId, role: GameParticipantRole.ORGANIZER },
        },
      },
      select: { tournamentId: true },
    });
    tournamentIds = [...new Set(games.map((g) => g.tournamentId))];
  }

  if (tournamentIds.length === 0) return [];

  const [matches, gameCounts] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentId: { in: tournamentIds } },
      include: {
        homeTeam: true,
        awayTeam: true,
        tournament: true,
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.game.groupBy({
      by: ["tournamentId"],
      where: { tournamentId: { in: tournamentIds } },
      _count: { id: true },
    }),
  ]);

  const gamesCountByTournament = new Map(
    gameCounts.map((row) => [row.tournamentId, row._count.id]),
  );

  const templateCache = new Map<string, Awaited<ReturnType<typeof findTemplateForTournament>>>();

  const rows: AdminPlatformMatchRow[] = [];

  for (const match of matches) {
    const tournamentId = match.tournamentId;
    let template = templateCache.get(tournamentId);
    if (template === undefined) {
      template = await findTemplateForTournament(match.tournament);
      templateCache.set(tournamentId, template);
    }

    rows.push({
      id: match.id,
      status: match.status,
      startsAt: match.startsAt.toISOString(),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      stage: match.stage,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      templateTitle: template?.title ?? match.tournament.title,
      templateId: template?.id ?? null,
      tournamentId,
      linkedGamesCount: gamesCountByTournament.get(tournamentId) ?? 0,
    });
  }

  return rows;
}

export async function listTemplateTournamentIdsForRecalc(): Promise<string[]> {
  const templates = await prisma.tournamentTemplate.findMany({
    select: { championatUrl: true },
  });
  const externalIds = templates
    .map((t) => parseChampionatTournamentUrl(t.championatUrl)?.tournamentExternalId)
    .filter((id): id is string => Boolean(id));

  const tournaments = await prisma.tournament.findMany({
    where: { externalId: { in: externalIds } },
    select: { id: true },
  });

  return tournaments.map((t) => t.id);
}
