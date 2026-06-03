import { MatchStatus } from "@/generated/prisma/client";
import { championatLivePhaseToMatchStatus } from "@/lib/football-api/championat/championat-phase-to-match-status";
import type { ChampionatMatchLiveSnapshot } from "@/lib/football-api/championat/match-live-snapshot";
import { championatFinishedTrackingPatch } from "@/lib/football-api/championat/championat-tracking";
import { prisma } from "@/lib/db";
import { recalculateMatchScoresForTournament } from "@/lib/template-match-admin";
import { deriveWinnerTeamId } from "@/lib/utils";

type MatchSnapshotTarget = {
  id: string;
  tournamentId: string;
  startsAt: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string;
  awayTeamId: string;
  championatFinishedAt?: Date | null;
};

function reconcileStatusFromChampionat(
  match: MatchSnapshotTarget,
  snapshot: ChampionatMatchLiveSnapshot,
  proposed: MatchStatus | undefined,
): MatchStatus | undefined {
  if (!proposed) return undefined;

  const kickoffFuture = match.startsAt.getTime() > Date.now();
  const snapshotHasScore =
    snapshot.homeScore !== undefined && snapshot.awayScore !== undefined;

  if (
    proposed === MatchStatus.LIVE &&
    kickoffFuture &&
    !snapshotHasScore &&
    snapshot.liveStatus.phase === "scheduled"
  ) {
    return match.status === MatchStatus.LIVE
      ? MatchStatus.SCHEDULED
      : undefined;
  }

  return proposed;
}

export type ApplyChampionatSnapshotResult = {
  updated: boolean;
  status?: MatchStatus;
};

export async function applyChampionatSnapshotToMatch(
  match: MatchSnapshotTarget,
  snapshot: ChampionatMatchLiveSnapshot,
): Promise<ApplyChampionatSnapshotResult> {
  const updateData: {
    homeScore?: number;
    awayScore?: number;
    status?: MatchStatus;
    winnerTeamId?: string | null;
    championatTrackActive?: boolean;
    championatFinishedAt?: Date;
  } = {};

  if (
    snapshot.homeScore !== undefined &&
    snapshot.awayScore !== undefined &&
    (snapshot.homeScore !== match.homeScore ||
      snapshot.awayScore !== match.awayScore)
  ) {
    updateData.homeScore = snapshot.homeScore;
    updateData.awayScore = snapshot.awayScore;
  }

  const rawStatusFromPhase =
    snapshot.status ??
    championatLivePhaseToMatchStatus(snapshot.liveStatus.phase);
  let statusFromPhase = reconcileStatusFromChampionat(
    match,
    snapshot,
    rawStatusFromPhase,
  );

  if (
    !statusFromPhase &&
    match.status === MatchStatus.LIVE &&
    snapshot.liveStatus.phase === "scheduled" &&
    match.startsAt.getTime() > Date.now()
  ) {
    statusFromPhase = MatchStatus.SCHEDULED;
  }

  if (statusFromPhase && statusFromPhase !== match.status) {
    updateData.status = statusFromPhase;
  } else if (
    updateData.homeScore !== undefined &&
    match.status === MatchStatus.SCHEDULED
  ) {
    updateData.status = MatchStatus.LIVE;
  }

  const nextStatus = updateData.status ?? match.status;
  const homeScore = updateData.homeScore ?? match.homeScore;
  const awayScore = updateData.awayScore ?? match.awayScore;

  if (
    nextStatus === MatchStatus.FINISHED &&
    homeScore !== null &&
    awayScore !== null
  ) {
    updateData.winnerTeamId = deriveWinnerTeamId(
      homeScore,
      awayScore,
      match.homeTeamId,
      match.awayTeamId,
    );
  }

  const trackingPatch = championatFinishedTrackingPatch(
    match.status,
    nextStatus,
    match.championatFinishedAt,
    new Date(),
  );
  Object.assign(updateData, trackingPatch);

  if (Object.keys(updateData).length === 0) {
    return { updated: false, status: match.status };
  }

  await prisma.match.update({
    where: { id: match.id },
    data: updateData,
  });

  const becameFinished =
    nextStatus === MatchStatus.FINISHED &&
    match.status !== MatchStatus.FINISHED;

  if (
    becameFinished ||
    (nextStatus === MatchStatus.FINISHED &&
      (updateData.homeScore !== undefined || updateData.awayScore !== undefined))
  ) {
    try {
      await recalculateMatchScoresForTournament(match.tournamentId, match.id);
    } catch (err) {
      console.warn(
        `[championat] score recalc failed match=${match.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    updated: true,
    status: updateData.status ?? match.status,
  };
}
