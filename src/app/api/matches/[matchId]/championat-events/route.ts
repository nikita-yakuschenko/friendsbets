import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyChampionatSnapshotToMatch } from "@/lib/football-api/championat/apply-championat-snapshot";
import { fetchChampionatMatchLiveSnapshot } from "@/lib/football-api/championat/match-live-snapshot";
import { resolveChampionatSourceForTournament } from "@/lib/football-api/championat/resolve-source";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      tournamentId: true,
      externalId: true,
      startsAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      championatFinishedAt: true,
      homeTeam: { select: { externalId: true } },
      awayTeam: { select: { externalId: true } },
    },
  });

  if (!match || !isMatchPredictable(match)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const game = await prisma.game.findFirst({
    where: {
      tournamentId: match.tournamentId,
      participants: { some: { userId: session.id } },
    },
    select: { id: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const source = await resolveChampionatSourceForTournament(match.tournamentId);
  if (!source || !match.externalId?.startsWith("championat:")) {
    const scheduledStatus = {
      phase: "scheduled" as const,
      rawText: "",
    };
    return NextResponse.json({
      events: [],
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      livePhase: "scheduled",
      liveStatus: scheduledStatus,
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const snapshot = await fetchChampionatMatchLiveSnapshot(match.externalId, {
      tournamentId: source.championatTournamentId,
      sportSlug: source.sportSlug,
    });

    const applyResult = await applyChampionatSnapshotToMatch(match, snapshot);

    await prisma.match.update({
      where: { id: matchId },
      data: { championatLastSyncAt: new Date() },
    });

    const refreshed = applyResult.updated
      ? await prisma.match.findUnique({
          where: { id: matchId },
          select: { homeScore: true, awayScore: true },
        })
      : null;

    const homeScore = refreshed?.homeScore ?? match.homeScore;
    const awayScore = refreshed?.awayScore ?? match.awayScore;

    return NextResponse.json({
      events: snapshot.events,
      homeScore,
      awayScore,
      livePhase: snapshot.livePhase,
      liveStatus: snapshot.liveStatus,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(
      `[championat-events] failed match=${matchId}`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Не удалось загрузить события с Championat." },
      { status: 502 },
    );
  }
}
