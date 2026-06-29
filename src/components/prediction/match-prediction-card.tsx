"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { LiveBadge } from "@/components/game/live-badge";
import { FinishedMatchPredictionsButton } from "@/components/prediction/finished-match-predictions-button";
import { Badge } from "@/components/ui/badge";
import type {
  ChampionatLivePhase,
  ChampionatLiveStatus,
} from "@/lib/football-api/championat/match-live-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MatchPenaltyScoreLine } from "@/components/match/match-penalty-score-line";
import { TeamLabel } from "@/components/team/team-label";
import { hasMatchPenaltyScore } from "@/lib/match-penalty-display";
import { getFlagImageSrcSet, getFlagImageUrl } from "@/lib/teams";
import { liveScoreForDisplay } from "@/lib/live-match-score";
import { isKnockoutStage } from "@/lib/match-stage";
import { formatMatchVenue } from "@/lib/venue";
import { cn, formatDateTimeMoscow } from "@/lib/utils";
import { savePredictionAction } from "@/server/actions/predictions";
import type { ActionResult } from "@/server/actions/auth";
import { useTickingLiveStatus } from "@/hooks/use-ticking-live-status";

/** Одна ширина для «Сделать прогноз», «Изменить прогноз» и «Сохранить». */
const matchActionButtonClassName = "w-[14.5rem] max-w-full shrink-0";
const LIVE_POLL_MS = 30_000;

type MatchCardProps = {
  gameId: string;
  match: {
    id: string;
    startsAt: Date;
    status: string;
    venueName: string | null;
    venueCity: string | null;
    homeTeam: { name: string; shortName: string; countryCode?: string | null };
    awayTeam: { name: string; shortName: string; countryCode?: string | null };
    homeScore: number | null;
    awayScore: number | null;
    homePenaltyScore?: number | null;
    awayPenaltyScore?: number | null;
    stage?: string | null;
  };
  prediction: {
    homeScore: number;
    awayScore: number;
  } | null;
  canPredict: boolean;
  locked: boolean;
  postponed: boolean;
  inProgress?: boolean;
  staleAwaitingResult?: boolean;
  liveHref?: string;
  points: number;
  scoreReason?: string | null;
};

function MatchMeta({
  startsAt,
  venueName,
  venueCity,
}: {
  startsAt: Date;
  venueName: string | null;
  venueCity: string | null;
}) {
  const venue = formatMatchVenue(venueName, venueCity);

  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center text-sm text-brand-muted">
      <p className="max-w-full wrap-break-word">{formatDateTimeMoscow(new Date(startsAt))}</p>
      {venue ? <p className="max-w-full wrap-break-word px-1">{venue}</p> : null}
    </div>
  );
}

const scoreCellViewClassName =
  "box-border flex h-9 w-11 min-w-11 max-w-11 shrink-0 items-center justify-center border border-transparent text-base font-semibold tabular-nums sm:h-10 sm:w-14 sm:min-w-14 sm:max-w-14 sm:text-lg";

const scoreCellInputClassName =
  "box-border h-9 w-11 min-w-11 max-w-11 shrink-0 rounded-lg border border-brand-neutral bg-brand-bg text-center text-base font-semibold tabular-nums sm:h-10 sm:w-14 sm:min-w-14 sm:max-w-14 sm:rounded-xl sm:text-lg";

function ScoreRow({
  match,
  prediction,
  editing,
  fieldErrors,
  onScoreChange,
  liveScores,
  penaltyScores,
}: {
  match: MatchCardProps["match"];
  prediction: MatchCardProps["prediction"];
  editing: boolean;
  fieldErrors?: { home: boolean; away: boolean };
  onScoreChange?: () => void;
  liveScores?: { home: number | null; away: number | null };
  penaltyScores?: { home: number | null; away: number | null };
}) {
  const useLive = Boolean(liveScores) && !editing;
  const penaltyHome = penaltyScores?.home ?? match.homePenaltyScore ?? null;
  const penaltyAway = penaltyScores?.away ?? match.awayPenaltyScore ?? null;
  const showPenalties = hasMatchPenaltyScore(penaltyHome, penaltyAway);

  const homeValue = useLive
    ? liveScoreForDisplay(liveScores!.home)
    : prediction
      ? prediction.homeScore
      : "—";
  const awayValue = useLive
    ? liveScoreForDisplay(liveScores!.away)
    : prediction
      ? prediction.awayScore
      : "—";
  const emptyScore = useLive ? false : !prediction;

  return (
    <div className="space-y-0.5">
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-x-1 gap-y-0.5 py-1">
      <TeamLabel
        name={match.homeTeam.name}
        countryCode={match.homeTeam.countryCode}
        matchSide="home"
        className="min-w-0 max-w-full justify-self-end text-xs sm:text-sm"
        flagClassName="h-3 w-4 sm:h-[18px] sm:w-6"
      />
      {editing ? (
        <Input
          id={`home-${match.id}`}
          name="homeScore"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={prediction?.homeScore ?? ""}
          onChange={onScoreChange}
          className={cn(
            scoreCellInputClassName,
            "px-0.5 py-0 focus-visible:outline-none focus-visible:ring-1",
            fieldErrors?.home
              ? "border-brand-red focus-visible:ring-brand-red"
              : "focus-visible:ring-brand-lime",
          )}
          aria-invalid={fieldErrors?.home || undefined}
          aria-label={`Счёт ${match.homeTeam.name}`}
        />
      ) : (
        <span
          className={`${scoreCellViewClassName}${emptyScore ? " text-brand-muted" : " text-white"}`}
        >
          {homeValue}
        </span>
      )}
      <span className="w-2 shrink-0 text-center text-base text-brand-muted sm:w-3 sm:text-lg">:</span>
      {editing ? (
        <Input
          id={`away-${match.id}`}
          name="awayScore"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={prediction?.awayScore ?? ""}
          onChange={onScoreChange}
          className={cn(
            scoreCellInputClassName,
            "px-0.5 py-0 focus-visible:outline-none focus-visible:ring-1",
            fieldErrors?.away
              ? "border-brand-red focus-visible:ring-brand-red"
              : "focus-visible:ring-brand-lime",
          )}
          aria-invalid={fieldErrors?.away || undefined}
          aria-label={`Счёт ${match.awayTeam.name}`}
        />
      ) : (
        <span
          className={`${scoreCellViewClassName}${emptyScore ? " text-brand-muted" : " text-white"}`}
        >
          {awayValue}
        </span>
      )}
      <TeamLabel
        name={match.awayTeam.name}
        countryCode={match.awayTeam.countryCode}
        matchSide="away"
        className="min-w-0 max-w-full justify-self-start text-xs sm:text-sm"
        flagClassName="h-3 w-4 sm:h-[18px] sm:w-6"
      />
      </div>
      {showPenalties ? (
        <MatchPenaltyScoreLine
          homePenaltyScore={penaltyHome!}
          awayPenaltyScore={penaltyAway!}
        />
      ) : null}
    </div>
  );
}

function PredictionTeamFlag({
  countryCode,
}: {
  countryCode?: string | null;
}) {
  const flagUrl = getFlagImageUrl(countryCode ?? null);
  if (!flagUrl) return null;

  return (
    <img
      src={flagUrl}
      srcSet={getFlagImageSrcSet(countryCode ?? null) ?? undefined}
      width={16}
      height={12}
      alt=""
      aria-hidden
      className="h-3 w-4 shrink-0 rounded-sm object-cover"
      loading="lazy"
      decoding="async"
    />
  );
}

const SCORING_REASON_WIN_LABELS: Record<string, string> = {
  "Точный счёт": "угадан точный счёт",
  "Угадан исход": "угадан исход",
  "Исход и разница мячей": "угаданы исход и разница мячей",
  "Исход и голы одной команды": "угаданы исход и голы одной команды",
  "Голы одной команды": "угаданы голы одной команды",
};

function scoringReasonWinLabel(reason: string | null): string {
  if (!reason) return "начислены очки";
  return (
    SCORING_REASON_WIN_LABELS[reason] ??
    reason.charAt(0).toLowerCase() + reason.slice(1)
  );
}

function formatPointsLabel(points: number): string {
  const n = Math.abs(points);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${points} очков`;
  if (mod10 === 1) return `${points} очко`;
  if (mod10 >= 2 && mod10 <= 4) return `${points} очка`;
  return `${points} очков`;
}

function FinishedPredictionOutcome({
  match,
  prediction,
  points,
  scoreReason,
  resultPending,
}: {
  match: MatchCardProps["match"];
  prediction: MatchCardProps["prediction"];
  points: number;
  scoreReason: string | null;
  resultPending: boolean;
}) {
  const won = points > 0;

  const pillClass = cn(
    "inline-flex w-full max-w-sm flex-col items-center gap-1 rounded-lg border-[0.5px] bg-brand-bg px-5 py-2 text-center text-[11px] leading-snug shadow-[0_4px_16px_rgba(0,0,0,0.3)] sm:max-w-md sm:text-xs",
    !prediction
      ? "border-brand-red/80"
      : resultPending
        ? "border-brand-neutral/80"
        : won
          ? "border-brand-lime/80"
          : "border-brand-red/80",
  );

  if (!prediction) {
    return (
      <div className={pillClass}>
        <span className="text-brand-muted">Прогноз не сделан</span>
        <span className="text-brand-muted">
          {resultPending ? "Ожидаем результат матча" : "Очки не начислены"}
        </span>
      </div>
    );
  }

  const predictionScore = (
    <span className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1 tabular-nums text-white">
      <span className="inline-flex items-center justify-end gap-0.5 text-right">
        <span className="truncate">{match.homeTeam.name}</span>
        <PredictionTeamFlag countryCode={match.homeTeam.countryCode} />
      </span>
      <span className="shrink-0 px-0.5">
        {prediction.homeScore}:{prediction.awayScore}
      </span>
      <span className="inline-flex items-center justify-start gap-0.5 text-left">
        <PredictionTeamFlag countryCode={match.awayTeam.countryCode} />
        <span className="truncate">{match.awayTeam.name}</span>
      </span>
    </span>
  );

  if (resultPending) {
    return (
      <div className={pillClass}>
        <span className="text-brand-muted">Ваш прогноз</span>
        {predictionScore}
        <span className="text-brand-muted">
          Очки начислятся после подтверждения результата
        </span>
      </div>
    );
  }

  if (won) {
    const ruleLabel = scoringReasonWinLabel(scoreReason);

    return (
      <div className={pillClass}>
        <span className="text-brand-muted">Ваш прогноз</span>
        {predictionScore}
        <span className="text-brand-muted">
          Прогноз совпал по правилу —{" "}
          <span className="text-white">{ruleLabel}</span>
        </span>
        <span className="font-medium text-brand-lime">
          Начислено: {formatPointsLabel(points)}
        </span>
      </div>
    );
  }

  return (
    <div className={pillClass}>
      <span className="text-brand-muted">Ваш прогноз</span>
      {predictionScore}
      <span className="text-white">Ставка не зашла</span>
      <span className="text-brand-muted">Очки не начислены</span>
    </div>
  );
}

export function MatchPredictionCard({
  gameId,
  match,
  canPredict,
  prediction,
  locked,
  postponed,
  inProgress = false,
  staleAwaitingResult = false,
  liveHref,
  points,
  scoreReason = null,
}: MatchCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ home: false, away: false });
  const [liveHome, setLiveHome] = useState<number | null>(match.homeScore);
  const [liveAway, setLiveAway] = useState<number | null>(match.awayScore);
  const [livePenaltyHome, setLivePenaltyHome] = useState<number | null>(
    match.homePenaltyScore ?? null,
  );
  const [livePenaltyAway, setLivePenaltyAway] = useState<number | null>(
    match.awayPenaltyScore ?? null,
  );
  const [liveStatus, setLiveStatus] = useState<ChampionatLiveStatus>({
    phase: "live",
    rawText: "",
  });
  const [liveStatusSyncedAt, setLiveStatusSyncedAt] = useState<string | null>(
    null,
  );
  const tickingLiveStatus = useTickingLiveStatus(
    liveStatus,
    liveStatusSyncedAt,
  );
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(savePredictionAction, undefined);

  const clearFieldErrors = () => setFieldErrors({ home: false, away: false });

  const fetchLiveScore = useCallback(async () => {
    if (!inProgress) return;
    try {
      const res = await fetch(`/api/matches/${match.id}/championat-events`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        homeScore?: number | null;
        awayScore?: number | null;
        homePenaltyScore?: number | null;
        awayPenaltyScore?: number | null;
        livePhase?: ChampionatLivePhase;
        liveStatus?: ChampionatLiveStatus;
        liveStatusSyncedAt?: string | null;
      };
      if (data.liveStatus) {
        setLiveStatus(data.liveStatus);
      } else if (data.livePhase) {
        setLiveStatus((prev) => ({ ...prev, phase: data.livePhase! }));
      }
      if (data.liveStatusSyncedAt) {
        setLiveStatusSyncedAt(data.liveStatusSyncedAt);
      }
      if (data.homeScore != null && data.awayScore != null) {
        setLiveHome(data.homeScore);
        setLiveAway(data.awayScore);
      }
      if (data.homePenaltyScore != null && data.awayPenaltyScore != null) {
        setLivePenaltyHome(data.homePenaltyScore);
        setLivePenaltyAway(data.awayPenaltyScore);
      }
    } catch {
      /* оставляем последний счёт */
    }
  }, [inProgress, match.id]);

  useEffect(() => {
    if (!inProgress) return;
    const run = () => void fetchLiveScore();
    const initial = window.setTimeout(run, 0);
    const interval = window.setInterval(run, LIVE_POLL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [inProgress, fetchLiveScore]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const homeRaw = String(formData.get("homeScore") ?? "").trim();
    const awayRaw = String(formData.get("awayScore") ?? "").trim();

    const homeEmpty = homeRaw === "";
    const awayEmpty = awayRaw === "";

    if (homeEmpty || awayEmpty) {
      event.preventDefault();
      setFieldErrors({ home: homeEmpty, away: awayEmpty });
      toast.error("Заполните счёт");
      return;
    }

    const homeScore = Number(homeRaw);
    const awayScore = Number(awayRaw);

    if (
      Number.isNaN(homeScore) ||
      Number.isNaN(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      event.preventDefault();
      setFieldErrors({ home: true, away: true });
      toast.error("Введите корректный счёт");
      return;
    }

    if (isKnockoutStage(match.stage) && homeScore === awayScore) {
      event.preventDefault();
      setFieldErrors({ home: true, away: true });
      toast.error("В плей-офф ничья невозможна — укажите победителя");
      return;
    }

    clearFieldErrors();
  }

  const prevActionStateRef = useRef<typeof state>(undefined);
  useEffect(() => {
    if (state === prevActionStateRef.current) return;
    prevActionStateRef.current = state;
    const id = window.setTimeout(() => {
      if (state?.success) {
        setFieldErrors({ home: false, away: false });
        setIsEditing(false);
        toast.success("Прогноз сохранён");
      } else if (state?.error) {
        toast.error(state.error);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [state]);

  const isFinished =
    match.status === "FINISHED" || staleAwaitingResult;
  const isPostponed = postponed || match.status === "POSTPONED";
  const editable = canPredict && !locked && !isFinished;
  const awaitingTeams =
    !canPredict && !locked && !isFinished && !isPostponed;

  const predictionBadgeVariant = prediction ? "default" : "destructive";
  const predictionBadgeText = prediction
    ? "Прогноз принят"
    : "Прогноз не сделан";

  const statusBadge = isFinished
    ? "secondary"
    : awaitingTeams
      ? "secondary"
      : locked
        ? "warning"
        : predictionBadgeVariant;

  const statusText = isFinished
    ? staleAwaitingResult && match.status !== "FINISHED"
      ? match.homeScore !== null && match.awayScore !== null
        ? "Матч завершен"
        : "Ожидаем результат"
      : "Матч завершен"
    : awaitingTeams
      ? "Команды неизвестны"
      : locked
        ? "Матч начался"
        : predictionBadgeText;

  const hasOfficialScore =
    match.homeScore !== null && match.awayScore !== null;

  const resultPending =
    isFinished &&
    (match.status !== "FINISHED" || !hasOfficialScore);

  const liveScores = inProgress
    ? { home: liveHome, away: liveAway }
    : isFinished && hasOfficialScore
      ? { home: match.homeScore, away: match.awayScore }
      : undefined;

  const cardInner = (
    <>
      <CardHeader
        className={cn(
          "flex items-center px-3 pb-0 pt-3 sm:px-4",
          inProgress && "justify-start",
          isPostponed && "justify-between",
          !inProgress && !isPostponed && "justify-end",
        )}
      >
        {inProgress ? (
          <LiveBadge status={tickingLiveStatus} />
        ) : isPostponed ? (
          <Badge variant="secondary">Матч перенесён</Badge>
        ) : null}
        {!inProgress ? (
          <div className="flex items-center gap-1">
            {isFinished ? (
              <FinishedMatchPredictionsButton
                gameRouteParam={gameId}
                matchId={match.id}
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
              />
            ) : null}
            <Badge variant={isPostponed ? predictionBadgeVariant : statusBadge}>
              {isPostponed ? predictionBadgeText : statusText}
            </Badge>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="min-w-0 space-y-3 px-3 pb-4 pt-1 sm:px-4">
        {editable ? (
          isEditing ? (
            <form
              action={formAction}
              noValidate
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="matchId" value={match.id} />
              <ScoreRow
                match={match}
                prediction={prediction}
                editing
                fieldErrors={fieldErrors}
                onScoreChange={clearFieldErrors}
              />
              <MatchMeta
                startsAt={match.startsAt}
                venueName={match.venueName}
                venueCity={match.venueCity}
              />
              <div className="flex justify-center">
                <Button
                  type="submit"
                  className={matchActionButtonClassName}
                  disabled={pending}
                >
                  Сохранить
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <ScoreRow match={match} prediction={prediction} editing={false} />
              <MatchMeta
                startsAt={match.startsAt}
                venueName={match.venueName}
                venueCity={match.venueCity}
              />
              <div className="flex justify-center">
                <Button
                  type="button"
                  className={matchActionButtonClassName}
                  onClick={() => {
                    clearFieldErrors();
                    setIsEditing(true);
                  }}
                >
                  {prediction ? "Изменить прогноз" : "Сделать прогноз"}
                </Button>
              </div>
            </div>
          )
        ) : (
            <div className="space-y-3">
            <ScoreRow
              match={match}
              prediction={prediction}
              editing={false}
              liveScores={liveScores}
              penaltyScores={
                inProgress
                  ? { home: livePenaltyHome, away: livePenaltyAway }
                  : undefined
              }
            />
            <MatchMeta
              startsAt={match.startsAt}
              venueName={match.venueName}
              venueCity={match.venueCity}
            />
            {awaitingTeams && (
              <p className="text-center text-sm text-brand-muted">
                Команды пока неизвестны. Побереги интуицию — прогнозы откроются чуть
                позже!
              </p>
            )}
            {!prediction && locked && !isFinished && !isPostponed && !awaitingTeams && (
              <p
                className={cn(
                  "text-center text-sm",
                  inProgress ? "font-medium text-brand-red" : "text-brand-muted",
                )}
              >
                Прогноз не сделан
              </p>
            )}
            {isFinished ? (
              <div className="flex justify-center border-t border-brand-neutral/50 pt-3">
                <FinishedPredictionOutcome
                  match={match}
                  prediction={prediction}
                  points={points}
                  scoreReason={scoreReason}
                  resultPending={resultPending}
                />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </>
  );

  if (inProgress && liveHref) {
    return (
      <Link
        href={liveHref}
        className="block w-full min-w-0 max-w-full rounded-2xl transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
      >
        <Card
          id={`match-${match.id}`}
          className={cn(
            "w-full min-w-0 max-w-full scroll-mt-20 overflow-hidden border-brand-lime/25 p-0",
            tickingLiveStatus.phase === "halftime" && "border-brand-neutral/50",
          )}
        >
          {cardInner}
        </Card>
      </Link>
    );
  }

  return (
    <Card
      id={`match-${match.id}`}
      className="w-full min-w-0 max-w-full scroll-mt-20 overflow-hidden p-0"
    >
      {cardInner}
    </Card>
  );
}
