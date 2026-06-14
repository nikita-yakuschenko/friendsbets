/**
 * Диагностика и очистка дублей PredictionScore.
 *
 * Проверка дублей:
 *   npx tsx scripts/fix-duplicate-prediction-scores.ts
 *
 * Удалить дубли (оставить самую свежую запись) и пересчитать очки турнира:
 *   npx tsx scripts/fix-duplicate-prediction-scores.ts --fix --recalc
 */
import "dotenv/config";
import { MatchStatus } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/db";
import { recalculateAllScoresForTournament } from "../src/lib/template-match-admin";

type DuplicateRow = {
  predictionId: string;
  cnt: bigint;
};

async function listDuplicates(): Promise<DuplicateRow[]> {
  return prisma.$queryRaw<DuplicateRow[]>`
    SELECT "predictionId", COUNT(*)::bigint AS cnt
    FROM "PredictionScore"
    GROUP BY "predictionId"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `;
}

async function removeDuplicates(): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE FROM "PredictionScore" AS older
    USING "PredictionScore" AS newer
    WHERE older."predictionId" = newer."predictionId"
      AND (
        older."calculatedAt" < newer."calculatedAt"
        OR (
          older."calculatedAt" = newer."calculatedAt"
          AND older.id < newer.id
        )
      )
  `;
  return Number(result);
}

async function listMissingScores(): Promise<
  Array<{
    predictionId: string;
    gameId: string;
    matchId: string;
    homeScore: number;
    awayScore: number;
    matchHome: number;
    matchAway: number;
  }>
> {
  return prisma.$queryRaw`
    SELECT
      p.id AS "predictionId",
      p."gameId",
      p."matchId",
      p."homeScore",
      p."awayScore",
      m."homeScore" AS "matchHome",
      m."awayScore" AS "matchAway"
    FROM "Prediction" p
    JOIN "Match" m ON m.id = p."matchId"
    LEFT JOIN "PredictionScore" ps ON ps."predictionId" = p.id
    WHERE m.status = ${MatchStatus.FINISHED}::"MatchStatus"
      AND m."homeScore" IS NOT NULL
      AND m."awayScore" IS NOT NULL
      AND ps.id IS NULL
    ORDER BY m."startsAt" DESC
    LIMIT 50
  `;
}

async function main(): Promise<void> {
  const fix = process.argv.includes("--fix");
  const recalc = process.argv.includes("--recalc");

  const duplicates = await listDuplicates();
  console.log(`Дублей predictionId: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log(
      duplicates
        .slice(0, 20)
        .map((row) => `  ${row.predictionId}: ${row.cnt} записей`)
        .join("\n"),
    );
  }

  const missing = await listMissingScores();
  console.log(`Прогнозов без PredictionScore (FINISHED): ${missing.length}`);
  if (missing.length > 0) {
    console.log(
      missing
        .slice(0, 10)
        .map(
          (row) =>
            `  pred=${row.predictionId} прогноз ${row.homeScore}:${row.awayScore} факт ${row.matchHome}:${row.matchAway}`,
        )
        .join("\n"),
    );
  }

  if (!fix) {
    console.log("\nДобавьте --fix для удаления дублей, --recalc для пересчёта турниров.");
    return;
  }

  const removed = await removeDuplicates();
  console.log(`\nУдалено дублей: ${removed}`);

  if (recalc) {
    const tournaments = await prisma.match.findMany({
      where: { status: MatchStatus.FINISHED },
      select: { tournamentId: true },
      distinct: ["tournamentId"],
    });
    for (const { tournamentId } of tournaments) {
      console.log(`Пересчёт турнира ${tournamentId}...`);
      await recalculateAllScoresForTournament(tournamentId);
    }
  }

  const left = await listDuplicates();
  console.log(`Дублей после фикса: ${left.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
