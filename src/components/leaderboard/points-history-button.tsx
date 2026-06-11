"use client";

import { useState, useTransition } from "react";
import { IconClock } from "@tabler/icons-react";
import { MatchTeamsRow } from "@/components/team/match-teams-row";
import { TeamLabel } from "@/components/team/team-label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type {
  PointsHistoryChampionEntry,
  PointsHistoryEntry,
  PointsHistoryMatchEntry,
} from "@/lib/leaderboard/points-history";
import { cn, formatDateTimeMoscow } from "@/lib/utils";

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
import { getParticipantPointsHistory } from "@/server/actions/points-history";

function formatScore(home: number, away: number): string {
  return `${home} : ${away}`;
}

function MatchHistoryCard({ entry }: { entry: PointsHistoryMatchEntry }) {
  return (
    <li className="rounded-xl border border-brand-neutral/80 bg-brand-bg/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] text-brand-muted">
            {formatDateTimeMoscow(toDate(entry.awardedAt))}
          </p>
          {entry.stage ? (
            <p className="text-[11px] text-brand-muted">{entry.stage}</p>
          ) : null}
          <MatchTeamsRow
            homeTeam={entry.homeTeam}
            awayTeam={entry.awayTeam}
            className="text-sm text-white"
          />
        </div>
        <span className="shrink-0 font-semibold tabular-nums text-brand-lime">
          +{entry.points}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs text-brand-muted">
        <p>
          Прогноз:{" "}
          <span className="font-medium text-white">
            {formatScore(entry.predictedHome, entry.predictedAway)}
          </span>
        </p>
        <p>
          Результат:{" "}
          <span className="font-medium text-white">
            {formatScore(entry.actualHome, entry.actualAway)}
          </span>
        </p>
        <p className="text-brand-lime/90">{entry.reason}</p>
      </div>
    </li>
  );
}

function ChampionHistoryCard({ entry }: { entry: PointsHistoryChampionEntry }) {
  return (
    <li className="rounded-xl border border-brand-neutral/80 bg-brand-bg/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] text-brand-muted">
            {toDate(entry.awardedAt).getTime() > 0
              ? formatDateTimeMoscow(toDate(entry.awardedAt))
              : "После финала турнира"}
          </p>
          <p className="text-sm text-white">Ставка на чемпиона</p>
          <TeamLabel
            name={entry.teamName}
            countryCode={entry.teamCountryCode}
            matchSide="home"
          />
        </div>
        <span className="shrink-0 font-semibold tabular-nums text-brand-lime">
          +{entry.points}
        </span>
      </div>
      <p className="mt-2 text-xs text-brand-lime/90">{entry.reason}</p>
    </li>
  );
}

function HistoryEntryCard({ entry }: { entry: PointsHistoryEntry }) {
  if (entry.kind === "champion") {
    return <ChampionHistoryCard entry={entry} />;
  }
  return <MatchHistoryCard entry={entry} />;
}

export function PointsHistoryButton({
  gameRouteParam,
  userId,
  displayName,
  platformView = false,
  className,
}: {
  gameRouteParam: string;
  userId: string;
  displayName: string;
  platformView?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<PointsHistoryEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadHistory = () => {
    if (loadedFor === userId) return;
    startTransition(async () => {
      setError(null);
      try {
        const data = await getParticipantPointsHistory(
          gameRouteParam,
          userId,
          platformView,
        );
        if (!data) {
          setError("Не удалось загрузить историю");
          return;
        }
        setEntries(data.entries);
        setTotalPoints(data.totalPoints);
        setLoadedFor(userId);
      } catch {
        setError("Не удалось загрузить историю");
      }
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) loadHistory();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        type="button"
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-brand-muted transition-colors hover:bg-brand-neutral/60 hover:text-brand-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime",
          className,
        )}
        aria-label={`История начисления очков: ${displayName}`}
        title="История начисления очков"
      >
        <IconClock className="size-4" aria-hidden />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[85vh] max-w-lg overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle>История очков</AlertDialogTitle>
          <AlertDialogDescription>
            {displayName}
            {totalPoints > 0 ? (
              <>
                {" "}
                · всего начислено{" "}
                <span className="font-medium text-brand-lime">{totalPoints}</span>
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {pending && loadedFor !== userId ? (
            <p className="py-6 text-center text-sm text-brand-muted">
              Загрузка…
            </p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-400">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-muted">
              Пока нет начислений. Очки появятся после завершения матчей с
              угаданным прогнозом.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <HistoryEntryCard key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
