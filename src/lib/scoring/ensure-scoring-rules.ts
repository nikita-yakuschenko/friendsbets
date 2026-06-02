import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";

export const ESSENTIAL_SCORING_RULES = [
  { title: "Классика", code: "FOOTBALL_CLASSIC" },
  { title: "Много очков", code: "MANY_POINTS" },
  { title: "Решает разница", code: "DIFFERENCE_DECIDES" },
  { title: "Сухие цифры", code: "DRY_NUMBERS" },
] as const;

/** Идемпотентно создаёт правила очков (нужны для /create и любой игры). */
export async function ensureScoringRules(
  db: PrismaClient = defaultPrisma,
): Promise<void> {
  await Promise.all(
    ESSENTIAL_SCORING_RULES.map((rule) =>
      db.scoringRule.upsert({
        where: { code: rule.code },
        update: { title: rule.title },
        create: {
          title: rule.title,
          code: rule.code,
          configJson: {},
        },
      }),
    ),
  );
}
