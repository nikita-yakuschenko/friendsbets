"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/game/live-badge";
import type {
  ChampionatLivePhase,
  ChampionatLiveStatus,
} from "@/lib/football-api/championat/match-live-status";
import { LiveMatchCardTabs } from "@/components/game/live-match-card-tabs";
import type { LiveMatchPredictionsPanelProps } from "@/components/game/live-match-predictions-panel";
import { TeamLabel } from "@/components/team/team-label";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";
import { MatchPenaltyScoreLine } from "@/components/match/match-penalty-score-line";
import { sanitizeStoredScore } from "@/lib/football-api/championat/football-score";
import { hasMatchPenaltyScore } from "@/lib/match-penalty-display";
import { formatLiveScoreLine } from "@/lib/live-match-score";
import { formatMatchVenue } from "@/lib/venue";
import { cn, formatDateTimeMoscow } from "@/lib/utils";
import { useTickingLiveStatus } from "@/hooks/use-ticking-live-status";

const POLL_MS = 15_000;

export type LiveMatchCardProps = {
  matchId: string;
  initialEvents?: ChampionatMatchEvent[];
  match: {
    startsAt: Date | string;
    status: string;
    stage: string | null;
    venueName: string | null;
    venueCity: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homePenaltyScore: number | null;
    awayPenaltyScore: number | null;
    homeTeam: { name: string; countryCode: string | null };
    awayTeam: { name: string; countryCode: string | null };
  };
} & LiveMatchPredictionsPanelProps;

export { LiveBadge } from "@/components/game/live-badge";

export function LiveMatchCard({
  matchId,
  initialEvents = [],
  match,
  myPrediction,
  friendPredictions,
  stats,
  statsComment,
  hideFriendScores = false,
}: LiveMatchCardProps) {
  const router = useRouter();
  const venue = formatMatchVenue(match.venueName, match.venueCity);
  const startsAt =
    match.startsAt instanceof Date
      ? match.startsAt
      : new Date(match.startsAt);

  const initialScore = sanitizeStoredScore(match.homeScore, match.awayScore);
  const [homeScore, setHomeScore] = useState<number | null>(initialScore.homeScore);
  const [awayScore, setAwayScore] = useState<number | null>(initialScore.awayScore);
  const [homePenaltyScore, setHomePenaltyScore] = useState<number | null>(
    match.homePenaltyScore,
  );
  const [awayPenaltyScore, setAwayPenaltyScore] = useState<number | null>(
    match.awayPenaltyScore,
  );
  const [events, setEvents] = useState<ChampionatMatchEvent[]>(initialEvents);
  const [livePhase, setLivePhase] = useState<ChampionatLivePhase>(() =>
    match.status === "FINISHED" ? "finished" : "live",
  );
  const [liveStatus, setLiveStatus] = useState<ChampionatLiveStatus>(() => ({
    phase: match.status === "FINISHED" ? "finished" : "live",
    rawText: "",
  }));
  const [liveStatusSyncedAt, setLiveStatusSyncedAt] = useState<string | null>(
    null,
  );
  const tickingLiveStatus = useTickingLiveStatus(
    liveStatus,
    liveStatusSyncedAt,
  );
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const scoreRef = useRef({
    home: initialScore.homeScore,
    away: initialScore.awayScore,
  });

  useEffect(() => {
    scoreRef.current = { home: homeScore, away: awayScore };
  }, [homeScore, awayScore]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/championat-events`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        events?: ChampionatMatchEvent[];
        homeScore?: number | null;
        awayScore?: number | null;
        homePenaltyScore?: number | null;
        awayPenaltyScore?: number | null;
        livePhase?: ChampionatLivePhase;
        liveStatus?: ChampionatLiveStatus;
        liveStatusSyncedAt?: string | null;
        error?: string;
        syncError?: string;
        stale?: boolean;
      };

      if (!res.ok) {
        setEventsError(data.error ?? "Не удалось обновить события.");
        setSyncWarning(null);
        return;
      }

      setEventsError(null);
      setSyncWarning(
        data.syncError ??
          (data.stale
            ? "Данные с Championat обновляются с задержкой. Показан последний сохранённый снимок."
            : null),
      );
      if (data.events) setEvents(data.events);
      if (data.liveStatus) {
        setLiveStatus(data.liveStatus);
        setLivePhase(data.liveStatus.phase);
      } else if (data.livePhase) {
        setLivePhase(data.livePhase);
      }
      if (data.liveStatusSyncedAt) {
        setLiveStatusSyncedAt(data.liveStatusSyncedAt);
      }

      const sanitized = sanitizeStoredScore(
        data.homeScore ?? null,
        data.awayScore ?? null,
      );
      const nextHome = sanitized.homeScore;
      const nextAway = sanitized.awayScore;
      const { home: prevHome, away: prevAway } = scoreRef.current;
      setHomeScore(nextHome);
      setAwayScore(nextAway);
      if (nextHome !== prevHome || nextAway !== prevAway) {
        router.refresh();
      }
      if (data.homePenaltyScore != null && data.awayPenaltyScore != null) {
        setHomePenaltyScore(data.homePenaltyScore);
        setAwayPenaltyScore(data.awayPenaltyScore);
      }
    } catch {
      setEventsError("Не удалось обновить события.");
    } finally {
      setEventsLoading(false);
    }
  }, [matchId, router]);

  useEffect(() => {
    const run = () => void fetchLive();
    const initial = window.setTimeout(run, 0);
    const interval = window.setInterval(run, POLL_MS);
    const onFocus = () => run();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchLive]);

  const hasPenalties = hasMatchPenaltyScore(homePenaltyScore, awayPenaltyScore);
  const liveScore = formatLiveScoreLine(homeScore, awayScore);
  const isHalftime = tickingLiveStatus.phase === "halftime";

  return (
    <Card
      className={cn(
        "overflow-hidden p-0",
        isHalftime ? "border-brand-neutral/50" : "border-brand-lime/25",
      )}
    >
      <CardContent className="px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <LiveBadge status={tickingLiveStatus} />
          {match.stage ? (
            <p className="text-sm text-brand-muted">{match.stage}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex justify-end">
            <TeamLabel
              name={match.homeTeam.name}
              countryCode={match.homeTeam.countryCode}
              matchSide="home"
              className="text-base font-semibold sm:text-lg"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
              {liveScore.home}
              <span className="mx-1 text-brand-muted">:</span>
              {liveScore.away}
            </p>
            {hasPenalties ? (
              <MatchPenaltyScoreLine
                homePenaltyScore={homePenaltyScore!}
                awayPenaltyScore={awayPenaltyScore!}
                compact
              />
            ) : null}
          </div>

          <TeamLabel
            name={match.awayTeam.name}
            countryCode={match.awayTeam.countryCode}
            matchSide="away"
            className="text-base font-semibold sm:text-lg"
          />
        </div>

        <div className="mt-3 space-y-1 text-center text-sm text-brand-muted">
          <p>{formatDateTimeMoscow(startsAt)}</p>
          {venue ? <p>{venue}</p> : null}
        </div>

        <LiveMatchCardTabs
          predictions={{
            myPrediction,
            friendPredictions,
            stats,
            statsComment,
            hideFriendScores,
          }}
          events={events}
          livePhase={livePhase}
          matchStatus={match.status}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
          syncWarning={syncWarning}
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
        />
      </CardContent>
    </Card>
  );
}
