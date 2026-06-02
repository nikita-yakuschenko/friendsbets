"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TeamLabel } from "@/components/team/team-label";
import { formatMatchVenue } from "@/lib/venue";
import { cn, formatDateTimeMoscow } from "@/lib/utils";
import { savePredictionAction } from "@/server/actions/predictions";
import type { ActionResult } from "@/server/actions/auth";

/** Одна ширина для «Сделать прогноз», «Изменить прогноз» и «Сохранить». */
const matchActionButtonClassName = "w-[14.5rem] max-w-full shrink-0";

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
  };
  prediction: {
    homeScore: number;
    awayScore: number;
  } | null;
  canPredict: boolean;
  locked: boolean;
  postponed: boolean;
  points: number;
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
}: {
  match: MatchCardProps["match"];
  prediction: MatchCardProps["prediction"];
  editing: boolean;
  fieldErrors?: { home: boolean; away: boolean };
  onScoreChange?: () => void;
}) {
  const homeValue = prediction ? prediction.homeScore : "—";
  const awayValue = prediction ? prediction.awayScore : "—";
  const emptyScore = !prediction;

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-x-1 gap-y-0.5 py-1">
      <TeamLabel
        name={match.homeTeam.name}
        countryCode={match.homeTeam.countryCode}
        flagPosition="after"
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
        flagPosition="before"
        className="min-w-0 max-w-full justify-self-start text-xs sm:text-sm"
        flagClassName="h-3 w-4 sm:h-[18px] sm:w-6"
      />
    </div>
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

function FinishedMatchSummary({
  match,
  points,
}: {
  match: MatchCardProps["match"];
  points: number;
}) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;

  return (
    <div className="flex flex-col items-center gap-1 text-center text-sm">
      {hasResult ? (
        <p className="text-brand-muted">
          Исход:{" "}
          <span className="font-semibold tabular-nums text-white">
            {match.homeScore}:{match.awayScore}
          </span>
        </p>
      ) : (
        <p className="text-brand-muted">Исход не записан</p>
      )}
      <p className="text-brand-lime">Начислено: {formatPointsLabel(points)}</p>
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
  points,
}: MatchCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ home: false, away: false });
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(savePredictionAction, undefined);

  const clearFieldErrors = () => setFieldErrors({ home: false, away: false });

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

    clearFieldErrors();
  }

  useEffect(() => {
    if (state?.success) {
      toast.success("Прогноз сохранён");
      clearFieldErrors();
      setIsEditing(false);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const isFinished = match.status === "FINISHED";
  const isPostponed = postponed || match.status === "POSTPONED";
  const editable = canPredict && !locked && !isFinished && !isPostponed;
  const awaitingTeams = !canPredict && !locked && !isFinished && !isPostponed;

  const statusBadge = isFinished
    ? "secondary"
    : isPostponed
      ? "secondary"
      : awaitingTeams
        ? "secondary"
        : locked
          ? "warning"
          : prediction
            ? "default"
            : "destructive";

  const statusText = isFinished
    ? "Матч завершен"
    : isPostponed
      ? "Матч перенесён"
      : awaitingTeams
        ? "Команды неизвестны"
        : locked
          ? "Матч начался"
          : prediction
            ? "Прогноз принят"
            : "Прогноз не сделан";

  return (
    <Card className="w-full min-w-0 max-w-full overflow-hidden p-0">
      <CardHeader className="flex justify-end px-3 pb-0 pt-3 sm:px-4">
        <Badge variant={statusBadge}>{statusText}</Badge>
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
            <ScoreRow match={match} prediction={prediction} editing={false} />
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
              <p className="text-center text-sm text-brand-muted">Прогноз не сделан</p>
            )}
            {isFinished && <FinishedMatchSummary match={match} points={points} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
