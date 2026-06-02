import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import {
  ensureScoringRules,
  ESSENTIAL_SCORING_RULES,
} from "@/lib/scoring/ensure-scoring-rules";
import { SYSTEM_TEMPLATE_WC_2026 } from "@/lib/tournament-template-presets";

const ESSENTIALS_LOG_PREFIX = "[platform-essentials]";

/** Минимальный набор данных платформы без которого приложение не должно работать. */
export async function ensurePlatformEssentials(
  db: PrismaClient = defaultPrisma,
): Promise<void> {
  await ensureScoringRules(db);
  await ensureSystemTournamentTemplate(db);
}

export async function ensureSystemTournamentTemplate(
  db: PrismaClient = defaultPrisma,
): Promise<void> {
  await db.tournamentTemplate.upsert({
    where: { slug: SYSTEM_TEMPLATE_WC_2026.slug },
    update: {
      title: SYSTEM_TEMPLATE_WC_2026.title,
      description: SYSTEM_TEMPLATE_WC_2026.description,
      championatUrl: SYSTEM_TEMPLATE_WC_2026.championatUrl,
      isSystem: true,
    },
    create: {
      slug: SYSTEM_TEMPLATE_WC_2026.slug,
      title: SYSTEM_TEMPLATE_WC_2026.title,
      description: SYSTEM_TEMPLATE_WC_2026.description,
      championatUrl: SYSTEM_TEMPLATE_WC_2026.championatUrl,
      isSystem: true,
    },
  });
}

export async function assertPlatformEssentials(
  db: PrismaClient = defaultPrisma,
): Promise<void> {
  const [scoringCount, systemTemplateCount] = await Promise.all([
    db.scoringRule.count(),
    db.tournamentTemplate.count({ where: { isSystem: true } }),
  ]);

  const minScoring = ESSENTIAL_SCORING_RULES.length;
  if (scoringCount < minScoring) {
    throw new Error(
      `${ESSENTIALS_LOG_PREFIX} В БД ${scoringCount} правил очков, нужно минимум ${minScoring}.`,
    );
  }

  if (systemTemplateCount < 1) {
    throw new Error(
      `${ESSENTIALS_LOG_PREFIX} Нет системного шаблона турнира (${SYSTEM_TEMPLATE_WC_2026.slug}).`,
    );
  }
}

/** Вызывается при старте Node-процесса: upsert + проверка. Падает, если БД недоступна или данные не записались. */
export async function bootPlatformEssentials(
  db: PrismaClient = defaultPrisma,
): Promise<void> {
  await ensurePlatformEssentials(db);
  await assertPlatformEssentials(db);
  console.log(`${ESSENTIALS_LOG_PREFIX} scoring rules and system template OK`);
}
