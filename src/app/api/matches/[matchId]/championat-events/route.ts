import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-status";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { syncChampionatMatchLive } from "@/lib/football-api/championat/sync-championat-match-live";
import { isSuperadmin } from "@/lib/roles";

async function userCanViewMatchLive(
  userId: string,
  role: UserRole,
  tournamentId: string,
): Promise<boolean> {
  if (isSuperadmin(role)) return true;

  const participant = await prisma.gameParticipant.findFirst({
    where: {
      userId,
      game: { tournamentId },
    },
    select: { id: true },
  });

  return Boolean(participant);
}

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
      liveMinute: true,
      livePhaseCache: true,
      liveStatusRaw: true,
      homeTeam: { select: { externalId: true } },
      awayTeam: { select: { externalId: true } },
    },
  });

  if (!match || !isMatchPredictable(match)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await userCanViewMatchLive(
    session.id,
    session.role,
    match.tournamentId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await syncChampionatMatchLive(match);

  if (!result.ok && result.events.length === 0 && !result.snapshot) {
    return NextResponse.json(
      {
        error: "Не удалось загрузить данные с Championat.",
        events: [],
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        livePhase: "scheduled",
        liveStatus: { phase: "scheduled" as const, rawText: "" },
        fetchedAt: new Date().toISOString(),
        stale: true,
      },
      { status: 502 },
    );
  }

  const snapshot = result.snapshot;
  const cachedPhase = match.livePhaseCache as ChampionatLivePhase | null;
  const livePhase = snapshot?.livePhase ?? cachedPhase ?? "live";
  const liveStatus = snapshot?.liveStatus ?? {
    phase: livePhase,
    minute: match.liveMinute ?? undefined,
    rawText: match.liveStatusRaw ?? "",
  };

  return NextResponse.json({
    events: result.events,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    livePhase,
    liveStatus,
    fetchedAt: new Date().toISOString(),
    stale: result.fromCache,
    syncError: result.ok ? undefined : result.error,
  });
}
