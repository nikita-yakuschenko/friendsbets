import "dotenv/config";
import { MatchStatus } from "../src/generated/prisma/client";
import { parseChampionatTournamentUrl } from "../src/lib/championat-url";
import { prisma } from "../src/lib/db";
import { applyChampionatSnapshotToMatch } from "../src/lib/football-api/championat/apply-championat-snapshot";
import { fetchChampionatMatchLiveSnapshot } from "../src/lib/football-api/championat/match-live-snapshot";
import { syncChampionatTournament } from "../src/lib/football-api/sync";

const TOURNAMENT_URL =
  "https://www.championat.com/football/_southamerica/tournament/6880/";

async function main() {
  const parsed = parseChampionatTournamentUrl(TOURNAMENT_URL);
  if (!parsed) throw new Error("Invalid tournament URL");

  const tournament = await prisma.tournament.findFirst({
    where: { externalId: parsed.tournamentExternalId },
    select: { id: true, title: true },
  });

  if (!tournament) {
    console.error("Tournament not in DB:", parsed.tournamentExternalId);
    process.exit(1);
  }

  console.log("Sync calendar for", tournament.title, tournament.id);
  const cal = await syncChampionatTournament(tournament.id, parsed, {
    enrichVenues: true,
  });
  console.log("Calendar sync:", cal);

  const stale = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      status: { notIn: [MatchStatus.FINISHED, MatchStatus.CANCELLED] },
      startsAt: { lt: new Date() },
      externalId: { startsWith: "championat:" },
    },
    select: {
      id: true,
      tournamentId: true,
      externalId: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      startsAt: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });

  console.log("Stale/past matches to enrich:", stale.length);

  for (const match of stale) {
    if (!match.externalId) continue;
    try {
      const snapshot = await fetchChampionatMatchLiveSnapshot(match.externalId, {
        tournamentId: parsed.championatTournamentId,
        sportSlug: parsed.sportSlug,
      });
      const result = await applyChampionatSnapshotToMatch(match, snapshot);
      await prisma.match.update({
        where: { id: match.id },
        data: {
          championatLastSyncAt: new Date(),
          ...(result.status === MatchStatus.FINISHED
            ? {
                championatFinishedAt: new Date(),
                championatTrackActive: true,
              }
            : {}),
        },
      });
      const row = await prisma.match.findUnique({
        where: { id: match.id },
        select: {
          status: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      });
      console.log(
        match.homeTeam.name,
        "vs",
        match.awayTeam.name,
        "->",
        row?.status,
        row?.homeScore,
        ":",
        row?.awayScore,
        result.updated ? "(updated)" : "(unchanged)",
      );
    } catch (err) {
      console.warn(match.id, err instanceof Error ? err.message : err);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
