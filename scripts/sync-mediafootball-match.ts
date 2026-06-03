import "dotenv/config";
import { parseChampionatTournamentUrl } from "../src/lib/championat-url";
import { prisma } from "../src/lib/db";
import { applyChampionatSnapshotToMatch } from "../src/lib/football-api/championat/apply-championat-snapshot";
import { fetchChampionatMatchLiveSnapshot } from "../src/lib/football-api/championat/match-live-snapshot";
import { syncChampionatTournament } from "../src/lib/football-api/sync";

const URL =
  "https://www.championat.com/football/_mediafootball/tournament/7026/";
const MATCH_EXT = "championat:1315436";

async function main() {
  const parsed = parseChampionatTournamentUrl(URL)!;
  const tournament = await prisma.tournament.findFirst({
    where: { externalId: parsed.tournamentExternalId },
  });
  if (!tournament) {
    console.error("Tournament 7026 not in DB");
    process.exit(1);
  }

  await syncChampionatTournament(tournament.id, parsed, { enrichVenues: true });

  const match = await prisma.match.findFirst({
    where: { tournamentId: tournament.id, externalId: MATCH_EXT },
    select: {
      id: true,
      tournamentId: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      startsAt: true,
      externalId: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });

  if (!match?.externalId) {
    console.error("Match 1315436 not found");
    process.exit(1);
  }

  const snapshot = await fetchChampionatMatchLiveSnapshot(match.externalId, {
    tournamentId: parsed.championatTournamentId,
    sportSlug: parsed.sportSlug,
  });

  await applyChampionatSnapshotToMatch(match, snapshot);

  const preds = await prisma.prediction.findMany({
    where: { matchId: match.id },
    include: { scores: true, user: { select: { name: true } } },
  });

  const updated = await prisma.match.findUnique({ where: { id: match.id } });
  console.log(
    match.homeTeam.name,
    "vs",
    match.awayTeam.name,
    "->",
    updated?.status,
    updated?.homeScore,
    ":",
    updated?.awayScore,
  );
  for (const p of preds) {
    const pts = p.scores.reduce((s, x) => s + x.points, 0);
    console.log(
      p.user.name,
      `прогноз ${p.homeScore}:${p.awayScore}`,
      `очки ${pts}`,
      p.scores[0]?.reason ?? "—",
    );
  }
}

main().finally(() => prisma.$disconnect());
