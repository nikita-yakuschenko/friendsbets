import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { ensureSystemTournamentTemplates } from "../src/lib/tournament-templates";

const LEGACY_DEMO_GAME_SLUG = "demo2026";
const LEGACY_DEMO_INVITE_CODES = ["demo2026", "DEMO2026"] as const;
const LEGACY_SEED_TOURNAMENT_ID = "seed-tournament-2026";

const LEGACY_MOCK_MATCH_IDS = [
  "match-1",
  "match-2",
  "match-3",
  "match-4",
  "match-live",
  "match-finished-empty",
] as const;

const LEGACY_MOCK_TEAM_IDS = [
  "team-ger",
  "team-esp",
  "team-fra",
  "team-eng",
  "team-bra",
  "team-arg",
] as const;

const LEGACY_DEMO_USER_EMAILS = [
  "nikita@friendsbets.local",
  "alex@friendsbets.local",
  "maria@friendsbets.local",
  "dima@friendsbets.local",
] as const;

/** Удаляет демо-игру, старый seed-турнир и моковые записи из ранних версий проекта. */
export async function removeLegacyDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.game.deleteMany({
    where: {
      OR: [
        { slug: LEGACY_DEMO_GAME_SLUG },
        { inviteCode: { in: [...LEGACY_DEMO_INVITE_CODES] } },
      ],
    },
  });

  await prisma.tournament.deleteMany({
    where: { id: LEGACY_SEED_TOURNAMENT_ID },
  });

  await prisma.match.deleteMany({
    where: { id: { in: [...LEGACY_MOCK_MATCH_IDS] } },
  });

  await prisma.team.deleteMany({
    where: { id: { in: [...LEGACY_MOCK_TEAM_IDS] } },
  });

  await prisma.user.deleteMany({
    where: { email: { in: [...LEGACY_DEMO_USER_EMAILS] } },
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
  await Promise.all([
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

  await ensureSystemTournamentTemplates();

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

  return { admin };
}
