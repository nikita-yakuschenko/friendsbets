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
import { formatMatchVenue } from "@/lib/venue";
import { cn, formatDateTimeMoscow } from "@/lib/utils";

const POLL_MS = 30_000;

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
  const [livePhase, setLivePhase] = useState<ChampionatLivePhase>(() =>
    match.status === "FINISHED" ? "finished" : "live",
  );
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
        setLivePhase(data.liveStatus.phase);
      } else if (data.livePhase) {
        setLivePhase(data.livePhase);
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
    void fetchPhase();
    const interval = window.setInterval(() => void fetchPhase(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [fetchPhase]);

  const hasLiveScore = homeScore != null && awayScore != null;
  const isHalftime = liveStatus.phase === "halftime";

  return (
    <section>
      <Card
        className={cn(
          "relative overflow-hidden p-0",
          isHalftime ? "border-brand-neutral/50" : "border-brand-lime/25",
        )}
      >
        <CardContent className="relative px-4 py-3">
          <div className="relative z-10 mx-auto mb-3 flex w-full max-w-md justify-center">
            <FloatingPredictionNotice
              hasPrediction={hasPrediction}
              prediction={prediction}
              match={{
                ...match,
                startsAt,
                homeScore,
                awayScore,
              }}
              predictionsHref={predictionsHref}
            />
          </div>

          <div className="relative z-0 space-y-3">
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
                  flagPosition="after"
                  className="text-base font-semibold sm:text-lg"
                />
              </div>
              <div className="flex flex-col items-center">
                {hasLiveScore ? (
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
                    {homeScore}
                    <span className="mx-0.5 text-brand-muted">:</span>
                    {awayScore}
                  </p>
                ) : (
                  <p className="text-xl font-semibold text-brand-muted">— : —</p>
                )}
              </div>
              <TeamLabel
                name={match.awayTeam.name}
                countryCode={match.awayTeam.countryCode}
                flagPosition="before"
                className="text-base font-semibold sm:text-lg"
              />
            </div>

            <div className="space-y-1 text-center text-sm text-brand-muted">
              <p>{formatDateTimeMoscow(startsAt)}</p>
              {venue ? <p>{venue}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
