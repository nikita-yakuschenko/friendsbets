import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeStoredScore } from "@/lib/football-api/championat/football-score";
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

function championatSyncErrorMessage(error: string | undefined): string | undefined {
  if (!error) return undefined;
  if (error === "no_championat_source") {
    return "Для этого матча не настроен источник Championat.";
  }
  return "Обновление с Championat временно недоступно. Показаны сохранённые данные.";
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

  const fresh = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeScore: true,
      awayScore: true,
      liveMinute: true,
      livePhaseCache: true,
      liveStatusRaw: true,
    },
  });

  const storedScores = sanitizeStoredScore(
    fresh?.homeScore ?? result.homeScore,
    fresh?.awayScore ?? result.awayScore,
  );

  const snapshot = result.snapshot;
  const cachedPhase = (fresh?.livePhaseCache ??
    match.livePhaseCache) as ChampionatLivePhase | null;
  const livePhase =
    snapshot?.livePhase ??
    cachedPhase ??
    (match.status === "LIVE"
      ? "live"
      : match.status === "FINISHED"
        ? "finished"
        : "scheduled");
  const liveStatus = snapshot?.liveStatus ?? {
    phase: livePhase,
    minute: fresh?.liveMinute ?? match.liveMinute ?? undefined,
    rawText: fresh?.liveStatusRaw ?? match.liveStatusRaw ?? "",
  };

  return NextResponse.json({
    events: result.events,
    homeScore: storedScores.homeScore,
    awayScore: storedScores.awayScore,
    livePhase,
    liveStatus,
    fetchedAt: new Date().toISOString(),
    stale: !result.ok || result.fromCache,
    syncError: result.ok ? undefined : championatSyncErrorMessage(result.error),
  });
}
