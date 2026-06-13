import { MatchStatus } from "@/generated/prisma/client";
import { championatLivePhaseToMatchStatus } from "@/lib/football-api/championat/championat-phase-to-match-status";
import { hasImplausibleStoredScore } from "@/lib/football-api/championat/football-score";
import type { ChampionatMatchLiveSnapshot } from "@/lib/football-api/championat/match-live-snapshot";
import { championatFinishedTrackingPatch } from "@/lib/football-api/championat/championat-tracking";
import { inferChampionatFinishedStatus } from "@/lib/football-api/championat/infer-championat-finished-status";
import { hasScheduledKickoffStarted } from "@/lib/match-kickoff-delay";
import { prisma } from "@/lib/db";
import { notifyMatchResultParticipants } from "@/lib/match-result-notifications";
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
  now: Date = new Date(),
): MatchStatus | undefined {
  if (!proposed) return undefined;

  const kickoffFuture = !hasScheduledKickoffStarted(match.startsAt, now);

  // До kickoff по расписанию Championat не может перевести матч в LIVE/FINISHED.
  if (
    kickoffFuture &&
    (proposed === MatchStatus.LIVE || proposed === MatchStatus.FINISHED)
  ) {
    return match.status === MatchStatus.LIVE ||
      match.status === MatchStatus.FINISHED
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
  const now = new Date();
  const kickoffReached = hasScheduledKickoffStarted(match.startsAt, now);
  const updateData: {
    homeScore?: number;
    awayScore?: number;
    status?: MatchStatus;
    winnerTeamId?: string | null;
    championatTrackActive?: boolean;
    championatFinishedAt?: Date;
  } = {};

  const storedScoreBad = hasImplausibleStoredScore(
    match.homeScore,
    match.awayScore,
  );

  if (
    kickoffReached &&
    snapshot.homeScore !== undefined &&
    snapshot.awayScore !== undefined &&
    (snapshot.homeScore !== match.homeScore ||
      snapshot.awayScore !== match.awayScore ||
      storedScoreBad)
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
    now,
  );

  if (
    !statusFromPhase &&
    kickoffReached &&
    match.status === MatchStatus.LIVE &&
    snapshot.liveStatus.phase === "scheduled" &&
    match.startsAt.getTime() > now.getTime()
  ) {
    statusFromPhase = MatchStatus.SCHEDULED;
  }

  const inferredFinished = inferChampionatFinishedStatus({
    match: {
      status: match.status,
      startsAt: match.startsAt,
      homeScore: updateData.homeScore ?? match.homeScore,
      awayScore: updateData.awayScore ?? match.awayScore,
    },
    snapshotHomeScore: snapshot.homeScore,
    snapshotAwayScore: snapshot.awayScore,
    livePhase: snapshot.liveStatus.phase,
  });

  if (kickoffReached && inferredFinished === MatchStatus.FINISHED) {
    statusFromPhase = MatchStatus.FINISHED;
  }

  if (statusFromPhase && statusFromPhase !== match.status) {
    updateData.status = statusFromPhase;
  } else if (
    kickoffReached &&
    updateData.homeScore !== undefined &&
    match.status === MatchStatus.SCHEDULED
  ) {
    updateData.status = MatchStatus.LIVE;
  }

  if (!kickoffReached && match.status === MatchStatus.LIVE) {
    updateData.status = MatchStatus.SCHEDULED;
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

  if (becameFinished) {
    try {
      await notifyMatchResultParticipants(match.tournamentId, match.id);
    } catch (err) {
      console.warn(
        `[championat] match result notify failed match=${match.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const becameLive =
    nextStatus === MatchStatus.LIVE && match.status !== MatchStatus.LIVE;

  if (becameLive) {
    try {
      const { sendLiveRemindersForMatch } = await import(
        "@/lib/reminders/prediction-reminders"
      );
      await sendLiveRemindersForMatch(match.id);
    } catch (err) {
      console.warn(
        `[championat] live reminder failed match=${match.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    updated: true,
    status: updateData.status ?? match.status,
  };
}
