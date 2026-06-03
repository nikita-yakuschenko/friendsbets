import "dotenv/config";
import { prisma } from "../src/lib/db";
import { fetchChampionatMatchLiveSnapshot } from "../src/lib/football-api/championat/match-live-snapshot";
import { parseChampionatMatchPageHtml } from "../src/lib/football-api/championat/match-details";
import { fetchChampionatHtml } from "../src/lib/football-api/championat/fetch-html";

const IDS = ["1310928", "1310912", "1310910"];

async function main() {
  for (const id of IDS) {
    const ext = `championat:${id}`;
    const db = await prisma.match.findFirst({
      where: { externalId: ext },
      include: { homeTeam: true, awayTeam: true },
    });
    console.log("\n===", id, "===");
    if (db) {
      console.log("DB:", db.homeTeam.name, db.homeScore, db.awayScore, db.awayTeam.name);
      console.log("status", db.status, "startsAt", db.startsAt.toISOString());
      console.log("track", db.championatTrackActive, "finishedAt", db.championatFinishedAt);
    } else console.log("NOT IN DB");

    const url = `https://www.championat.com/football/_southamerica/tournament/6880/match/${id}/`;
    const html = await fetchChampionatHtml(url);
    const details = parseChampionatMatchPageHtml(html);
    const snap = await fetchChampionatMatchLiveSnapshot(ext, {
      tournamentId: 6880,
      sportSlug: "_southamerica",
    });
    console.log("details", details);
    console.log("snapshot", {
      home: snap.homeScore,
      away: snap.awayScore,
      status: snap.status,
      phase: snap.livePhase,
      events: snap.events.length,
      lastEventScore: snap.events.filter((e) => e.score).slice(-3),
    });
  }
}

main().finally(() => prisma.$disconnect());
