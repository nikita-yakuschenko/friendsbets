"use client";

import { useCallback, useEffect, useState } from "react";
import { FloatingPredictionNotice } from "@/components/game/next-match-preview";
import { LiveBadge } from "@/components/game/live-badge";
import { TeamLabel } from "@/components/team/team-label";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ChampionatLivePhase,
  ChampionatLiveStatus,
} from "@/lib/football-api/championat/match-live-status";
import { formatLiveScoreLine } from "@/lib/live-match-score";
import { formatMatchVenue } from "@/lib/venue";
import { cn, formatDateTimeMoscow } from "@/lib/utils";

const POLL_MS = 15_000;

type LiveMatchHomePreviewProps = {
  matchId: string;
  match: {
    startsAt: Date | string;
    status: string;
    stage: string | null;
    venueName: string | null;
    venueCity: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: { name: string; countryCode: string | null };
    awayTeam: { name: string; countryCode: string | null };
  };
  hasPrediction: boolean;
  prediction?: { homeScore: number; awayScore: number } | null;
  predictionsHref?: string;
};

export function LiveMatchHomePreview({
  matchId,
  match,
  hasPrediction,
  prediction,
  predictionsHref,
}: LiveMatchHomePreviewProps) {
  const venue = formatMatchVenue(match.venueName, match.venueCity);
  const startsAt =
    match.startsAt instanceof Date
      ? match.startsAt
      : new Date(match.startsAt);
  const [homeScore, setHomeScore] = useState(match.homeScore);
  const [awayScore, setAwayScore] = useState(match.awayScore);
  const [liveStatus, setLiveStatus] = useState<ChampionatLiveStatus>(() => ({
    phase: match.status === "FINISHED" ? "finished" : "live",
    rawText: "",
  }));

  const fetchPhase = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/championat-events`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        livePhase?: ChampionatLivePhase;
        liveStatus?: ChampionatLiveStatus;
        homeScore?: number | null;
        awayScore?: number | null;
      };
      if (data.liveStatus) {
        setLiveStatus(data.liveStatus);
      } else if (data.livePhase) {
        setLiveStatus((prev) => ({ ...prev, phase: data.livePhase! }));
      }
      if (data.homeScore != null && data.awayScore != null) {
        setHomeScore(data.homeScore);
        setAwayScore(data.awayScore);
      }
    } catch {
      /* тихо — остаётся последнее известное состояние */
    }
  }, [matchId]);

  useEffect(() => {
    const run = () => void fetchPhase();
    const initial = window.setTimeout(run, 0);
    const interval = window.setInterval(run, POLL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [fetchPhase]);

  const liveScore = formatLiveScoreLine(homeScore, awayScore);
  const isHalftime = liveStatus.phase === "halftime";

  return (
    <section>
      <Card
        className={cn(
          "relative overflow-hidden p-0",
          isHalftime ? "border-brand-neutral/50" : "border-brand-lime/25",
        )}
      >
        <CardContent className="relative flex flex-col gap-3 px-4 py-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <LiveBadge status={liveStatus} />
              {match.stage ? (
                <p className="text-sm text-brand-muted">{match.stage}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 sm:gap-x-3">
              <div className="flex justify-end">
                <TeamLabel
                  name={match.homeTeam.name}
                  countryCode={match.homeTeam.countryCode}
                  matchSide="home"
                  className="text-base font-semibold sm:text-lg"
                />
              </div>
              <div className="flex flex-col items-center">
                <p className="text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
                  {liveScore.home}
                  <span className="mx-0.5 text-brand-muted">:</span>
                  {liveScore.away}
                </p>
              </div>
              <TeamLabel
                name={match.awayTeam.name}
                countryCode={match.awayTeam.countryCode}
                matchSide="away"
                className="text-base font-semibold sm:text-lg"
              />
            </div>

            <div className="space-y-1 text-center text-sm text-brand-muted">
              <p>{formatDateTimeMoscow(startsAt)}</p>
              {venue ? <p>{venue}</p> : null}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md justify-center border-t border-brand-neutral/50 pt-3">
            <FloatingPredictionNotice
              hasPrediction={hasPrediction}
              prediction={prediction}
              match={{
                ...match,
                startsAt,
              }}
              predictionsHref={predictionsHref}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
