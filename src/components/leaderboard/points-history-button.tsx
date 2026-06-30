"use client";

import { useState, useTransition } from "react";
import { IconArrowLeft, IconClock, IconX } from "@tabler/icons-react";
import { MatchTeamsRow } from "@/components/team/match-teams-row";
import { TeamLabel } from "@/components/team/team-label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type {
  PointsHistoryChampionEntry,
  PointsHistoryEntry,
  PointsHistoryMatchEntry,
} from "@/lib/leaderboard/points-history";
import {
  formatMatchScoreWithPenalty,
  formatPenaltyOutcomeLine,
  hasMatchPenaltyScore,
} from "@/lib/match-penalty-display";
import { cn, formatDateTimeMoscow } from "@/lib/utils";
import { getParticipantPointsHistory } from "@/server/actions/points-history";

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatScore(home: number, away: number): string {
  return `${home} : ${away}`;
}

function MatchHistoryCard({ entry }: { entry: PointsHistoryMatchEntry }) {
  const hasPenalties = hasMatchPenaltyScore(
    entry.actualHomePenaltyScore,
    entry.actualAwayPenaltyScore,
  );

  return (
    <li className="rounded-xl border border-brand-neutral/80 bg-brand-bg/60 p-3.5 sm:p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] leading-snug text-brand-muted">
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
        <span className="self-start font-semibold tabular-nums text-brand-lime sm:shrink-0">
          +{entry.points}
        </span>
      </div>
      <div className="mt-2.5 space-y-1 text-xs leading-relaxed text-brand-muted">
        <p>
          Прогноз:{" "}
          <span className="font-medium text-white">
            {formatScore(entry.predictedHome, entry.predictedAway)}
          </span>
        </p>
        <p>
          Результат:{" "}
          <span className="font-medium text-white">
            {formatMatchScoreWithPenalty(
              entry.actualHome,
              entry.actualAway,
              entry.actualHomePenaltyScore,
              entry.actualAwayPenaltyScore,
            )}
          </span>
        </p>
        {hasPenalties ? (
          <p className="text-white/80">
            {formatPenaltyOutcomeLine(
              entry.homeTeam.name,
              entry.awayTeam.name,
              entry.actualHomePenaltyScore!,
              entry.actualAwayPenaltyScore!,
            )}
          </p>
        ) : null}
        <p className="text-brand-lime/90">{entry.reason}</p>
      </div>
    </li>
  );
}

function ChampionHistoryCard({ entry }: { entry: PointsHistoryChampionEntry }) {
  return (
    <li className="rounded-xl border border-brand-neutral/80 bg-brand-bg/60 p-3.5 sm:p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] leading-snug text-brand-muted">
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
        <span className="self-start font-semibold tabular-nums text-brand-lime sm:shrink-0">
          +{entry.points}
        </span>
      </div>
      <p className="mt-2.5 text-xs text-brand-lime/90">{entry.reason}</p>
    </li>
  );
}

function HistoryEntryCard({ entry }: { entry: PointsHistoryEntry }) {
  if (entry.kind === "champion") {
    return <ChampionHistoryCard entry={entry} />;
  }
  return <MatchHistoryCard entry={entry} />;
}

function HistoryBody({
  pending,
  loadedFor,
  userId,
  error,
  entries,
}: {
  pending: boolean;
  loadedFor: string | null;
  userId: string;
  error: string | null;
  entries: PointsHistoryEntry[];
}) {
  if (pending && loadedFor !== userId) {
    return (
      <p className="py-8 text-center text-sm text-brand-muted">Загрузка…</p>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-red-400">{error}</p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm leading-relaxed text-brand-muted">
        Пока нет начислений. Очки появятся после завершения матчей с угаданным
        прогнозом.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5 pb-1">
      {entries.map((entry) => (
        <HistoryEntryCard key={entry.id} entry={entry} />
      ))}
    </ul>
  );
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
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-brand-neutral/60 hover:text-brand-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime active:bg-brand-neutral/80 sm:size-7 sm:rounded-md",
          className,
        )}
        aria-label={`История начисления очков: ${displayName}`}
        title="История начисления очков"
      >
        <IconClock className="size-4 sm:size-3.5" aria-hidden />
      </AlertDialogTrigger>

      <AlertDialogContent
        className={cn(
          "z-[60] flex max-h-[min(92dvh,100%)] w-full flex-col gap-0 overflow-hidden p-0",
          "max-md:top-auto max-md:right-0 max-md:bottom-0 max-md:left-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-b-0",
          "md:max-h-[85vh] md:max-w-lg",
        )}
      >
        <div
          className="mx-auto mt-2 hidden h-1 w-10 shrink-0 rounded-full bg-brand-neutral/80 max-md:block"
          aria-hidden
        />

        <div className="flex shrink-0 items-start gap-2 border-b border-brand-neutral/60 px-4 py-3 sm:items-center">
          <AlertDialogCancel
            variant="secondary"
            size="sm"
            className="shrink-0 md:hidden"
          >
            <IconArrowLeft className="size-4 shrink-0" stroke={1.75} aria-hidden />
            Назад
          </AlertDialogCancel>

          <div className="min-w-0 flex-1 py-0.5">
            <AlertDialogTitle className="text-base sm:text-lg">
              История очков
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 line-clamp-2 text-xs sm:text-sm">
              <span className="text-white/90">{displayName}</span>
              {totalPoints > 0 ? (
                <>
                  {" "}
                  · всего{" "}
                  <span className="font-medium text-brand-lime">
                    {totalPoints}
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </div>

          <AlertDialogCancel
            variant="ghost"
            size="icon"
            className="hidden size-9 min-w-9 shrink-0 md:inline-flex"
            aria-label="Закрыть"
          >
            <IconX className="size-5" stroke={1.75} aria-hidden />
          </AlertDialogCancel>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch]">
          <HistoryBody
            pending={pending}
            loadedFor={loadedFor}
            userId={userId}
            error={error}
            entries={entries}
          />
        </div>

        <AlertDialogFooter className="hidden shrink-0 border-t border-brand-neutral/60 px-4 py-3 sm:flex">
          <AlertDialogCancel variant="secondary" size="sm">
            Закрыть
          </AlertDialogCancel>
        </AlertDialogFooter>

        <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] max-md:block md:hidden" />
      </AlertDialogContent>
    </AlertDialog>
  );
}
