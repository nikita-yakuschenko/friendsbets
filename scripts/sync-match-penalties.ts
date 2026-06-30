/**
 * Sync пенальти для конкретного матча с Championat.
 *
 * После деплоя (Германия — Парагвай, 1/16 финала ЧМ-2026):
 *   npm run sync:match-penalties
 *
 * Или явно по externalId:
 *   npx tsx scripts/sync-match-penalties.ts championat:1310262
 */
import "dotenv/config";
import { MatchStatus } from "../src/generated/prisma/client";
import { fetchChampionatMatchDetails } from "../src/lib/football-api/championat/match-details";
import { getChampionatSyncConfig } from "../src/lib/football-api/client";
import { prisma } from "../src/lib/db";
import { deriveMatchWinnerTeamId } from "../src/lib/utils";
import { recalculateMatchScoresForTournament } from "../src/lib/template-match-admin";

/** Германия — Парагвай, 1/16 финала ЧМ-2026 (серия пенальти 3:4). */
export const GERMANY_PARAGUAY_EXTERNAL_ID = "championat:1310262";

async function syncMatchPenalties(matchKey: string) {
  const match = await prisma.match.findFirst({
    where: matchKey.startsWith("championat:")
      ? { externalId: matchKey }
      : { id: matchKey },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      tournament: { select: { id: true, title: true } },
    },
  });

  if (!match) {
    throw new Error(`Матч не найден: ${matchKey}`);
  }

  const externalId = match.externalId;
  if (!externalId?.startsWith("championat:")) {
    throw new Error(`Не Championat-матч: ${externalId ?? "null"}`);
  }

  const championatMatchId = externalId.slice("championat:".length);
  const config = getChampionatSyncConfig();

  console.log("Матч:", match.homeTeam.name, "—", match.awayTeam.name);
  console.log("DB до sync:", {
    status: match.status,
    score: `${match.homeScore}:${match.awayScore}`,
    pen: `${match.homePenaltyScore}:${match.awayPenaltyScore}`,
    winnerTeamId: match.winnerTeamId,
  });

  const details = await fetchChampionatMatchDetails(championatMatchId, {
    tournamentId: config.championatTournamentId,
    sportSlug: config.sportSlug,
  });

  console.log("Championat:", details);

  if (
    details.homePenaltyScore === undefined ||
    details.awayPenaltyScore === undefined
  ) {
    throw new Error("На странице Championat нет серии пенальти");
  }

  const homeScore = details.homeScore ?? match.homeScore;
  const awayScore = details.awayScore ?? match.awayScore;
  if (homeScore == null || awayScore == null) {
    throw new Error("Нет счёта основного времени");
  }

  const winnerTeamId = deriveMatchWinnerTeamId({
    homeScore,
    awayScore,
    homePenaltyScore: details.homePenaltyScore,
    awayPenaltyScore: details.awayPenaltyScore,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    winnerTeamId: match.winnerTeamId,
  });

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      status: MatchStatus.FINISHED,
      homeScore,
      awayScore,
      homePenaltyScore: details.homePenaltyScore,
      awayPenaltyScore: details.awayPenaltyScore,
      winnerTeamId,
      championatFinishedAt: match.championatFinishedAt ?? new Date(),
    },
  });

  await recalculateMatchScoresForTournament(match.tournamentId, match.id);

  console.log("DB после sync:", {
    status: updated.status,
    score: `${updated.homeScore}:${updated.awayScore}`,
    pen: `${updated.homePenaltyScore}:${updated.awayPenaltyScore}`,
    winnerTeamId: updated.winnerTeamId,
  });
}

async function findGermanyParaguayExternalId(): Promise<string | null> {
  const match = await prisma.match.findFirst({
    where: {
      OR: [
        {
          homeTeam: { name: { contains: "Герман", mode: "insensitive" } },
          awayTeam: { name: { contains: "Параг", mode: "insensitive" } },
        },
        {
          homeTeam: { name: { contains: "Параг", mode: "insensitive" } },
          awayTeam: { name: { contains: "Герман", mode: "insensitive" } },
        },
      ],
    },
    select: { externalId: true, id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
  });

  if (!match) return null;
  console.log("Найден:", match.homeTeam.name, "—", match.awayTeam.name, match.externalId ?? match.id);
  return match.externalId ?? match.id;
}

async function main() {
  const arg = process.argv[2];
  const matchKey =
    arg ??
    (await findGermanyParaguayExternalId()) ??
    GERMANY_PARAGUAY_EXTERNAL_ID;

  await syncMatchPenalties(matchKey);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
