import {
  GameParticipantRole,
  PrismaClient,
  TournamentStatus,
  UserRole,
} from "../src/generated/prisma/client";
import { CHAMPIONAT_WORLD_CUP_2026 } from "../src/lib/football-api/championat/constants";

export const MOCK_MATCH_IDS = [
  "match-1",
  "match-2",
  "match-3",
  "match-4",
  "match-live",
  "match-finished-empty",
] as const;

export const MOCK_TEAM_IDS = [
  "team-ger",
  "team-esp",
  "team-fra",
  "team-eng",
  "team-bra",
  "team-arg",
] as const;

export const DEMO_USER_EMAILS = [
  "nikita@friendsbets.local",
  "alex@friendsbets.local",
  "maria@friendsbets.local",
  "dima@friendsbets.local",
] as const;

export const SEED_TOURNAMENT_ID = "seed-tournament-2026";
export const SEED_GAME_INVITE_CODE = "demo2026";
export const SEED_GAME_SLUG = "demo2026";

export async function cleanupMockData(prisma: PrismaClient): Promise<void> {
  await prisma.match.deleteMany({
    where: { id: { in: [...MOCK_MATCH_IDS] } },
  });

  await prisma.team.deleteMany({
    where: { id: { in: [...MOCK_TEAM_IDS] } },
  });

  await prisma.user.deleteMany({
    where: { email: { in: [...DEMO_USER_EMAILS] } },
  });

  const usedTeamIds = await prisma.match.findMany({
    select: { homeTeamId: true, awayTeamId: true },
  });
  const referencedTeamIds = new Set(
    usedTeamIds.flatMap((match) => [match.homeTeamId, match.awayTeamId]),
  );

  const placeholderTeams = await prisma.team.findMany({
    where: { externalId: { startsWith: "championat:slot:" } },
    select: { id: true },
  });

  const orphanPlaceholderIds = placeholderTeams
    .map((team) => team.id)
    .filter((id) => !referencedTeamIds.has(id));

  if (orphanPlaceholderIds.length > 0) {
    await prisma.team.deleteMany({
      where: { id: { in: orphanPlaceholderIds } },
    });
  }
}

export async function bootstrapEssentialData(
  prisma: PrismaClient,
  adminEmail: string,
  adminPasswordHash: string,
) {
  const scoringRules = await Promise.all([
    prisma.scoringRule.upsert({
      where: { code: "FOOTBALL_CLASSIC" },
      update: {},
      create: {
        title: "Классика",
        code: "FOOTBALL_CLASSIC",
        configJson: {},
      },
    }),
    prisma.scoringRule.upsert({
      where: { code: "MANY_POINTS" },
      update: {},
      create: {
        title: "Много очков",
        code: "MANY_POINTS",
        configJson: {},
      },
    }),
    prisma.scoringRule.upsert({
      where: { code: "DIFFERENCE_DECIDES" },
      update: {},
      create: {
        title: "Решает разница",
        code: "DIFFERENCE_DECIDES",
        configJson: {},
      },
    }),
    prisma.scoringRule.upsert({
      where: { code: "DRY_NUMBERS" },
      update: {},
      create: {
        title: "Сухие цифры",
        code: "DRY_NUMBERS",
        configJson: {},
      },
    }),
  ]);

  const manyPointsRule = scoringRules.find((rule) => rule.code === "MANY_POINTS");
  if (!manyPointsRule) {
    throw new Error("MANY_POINTS scoring rule not found.");
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const tournament = await prisma.tournament.upsert({
    where: { id: SEED_TOURNAMENT_ID },
    update: {
      externalId: "championat:tournament:6858",
      title: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
      description: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
      status: TournamentStatus.ACTIVE,
    },
    create: {
      id: SEED_TOURNAMENT_ID,
      externalId: "championat:tournament:6858",
      title: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
      description: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
      status: TournamentStatus.ACTIVE,
    },
  });

  const game = await prisma.game.upsert({
    where: { inviteCode: SEED_GAME_INVITE_CODE },
    update: {
      slug: SEED_GAME_SLUG,
      scoringRuleId: manyPointsRule.id,
      tournamentId: tournament.id,
    },
    create: {
      tournamentId: tournament.id,
      title: "Друзья — ЧМ 2026",
      slug: SEED_GAME_SLUG,
      inviteCode: SEED_GAME_INVITE_CODE,
      prizeFundText: "Призовой фонд: ужин у победителя",
      scoringRuleId: manyPointsRule.id,
      createdById: admin.id,
    },
  });

  await prisma.gameParticipant.upsert({
    where: { gameId_userId: { gameId: game.id, userId: admin.id } },
    update: { role: GameParticipantRole.ORGANIZER },
    create: {
      gameId: game.id,
      userId: admin.id,
      displayName: "Admin",
      role: GameParticipantRole.ORGANIZER,
    },
  });

  return { admin, tournament, game, manyPointsRule };
}
