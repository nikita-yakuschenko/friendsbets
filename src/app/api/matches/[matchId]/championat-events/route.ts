import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/client";
import { MatchStatus } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isChampionatLiveViewStale,
  loadChampionatMatchLiveView,
} from "@/lib/football-api/championat/load-championat-match-live-view";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { syncChampionatMatchLive } from "@/lib/football-api/championat/sync-championat-match-live";
import { isMatchInProgress } from "@/lib/match-prediction-state";
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

const matchSelect = {
  id: true,
  tournamentId: true,
  externalId: true,
  startsAt: true,
  status: true,
  homeScore: true,
  awayScore: true,
  homeTeamId: true,
  awayTeamId: true,
  winnerTeamId: true,
  championatFinishedAt: true,
  championatLastSyncAt: true,
  eventsSyncedAt: true,
  liveMinute: true,
  livePhaseCache: true,
  liveStatusRaw: true,
  homeTeam: { select: { externalId: true } },
  awayTeam: { select: { externalId: true } },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;
  const forceSync =
    new URL(request.url).searchParams.get("force") === "1" &&
    isSuperadmin(session.role);

  let match = await prisma.match.findUnique({
    where: { id: matchId },
    select: matchSelect,
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

  const canViewLiveData =
    match.status === MatchStatus.FINISHED ||
    isMatchInProgress(match) ||
    forceSync;
  if (!canViewLiveData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let syncError: string | undefined;

  const shouldBackgroundSync =
    !forceSync &&
    (isMatchInProgress(match) || match.status === MatchStatus.FINISHED) &&
    isChampionatLiveViewStale(match, match.championatLastSyncAt);

  if (forceSync || shouldBackgroundSync) {
    const syncResult = await syncChampionatMatchLive(match);
    if (!syncResult.ok) {
      syncError = championatSyncErrorMessage(syncResult.error);
    }
    match =
      (await prisma.match.findUnique({
        where: { id: matchId },
        select: matchSelect,
      })) ?? match;
  }

  const view = await loadChampionatMatchLiveView(matchId, match);
  const stale =
    !forceSync &&
    !syncError &&
    isChampionatLiveViewStale(match, view.championatLastSyncAt);

  return NextResponse.json({
    events: view.events,
    homeScore: view.homeScore,
    awayScore: view.awayScore,
    livePhase: view.livePhase,
    liveStatus: view.liveStatus,
    liveStatusSyncedAt: view.championatLastSyncAt?.toISOString() ?? null,
    fetchedAt: new Date().toISOString(),
    stale,
    syncError,
  });
}
