"use client";

import { useState, useTransition } from "react";
import { IconArrowLeft, IconClock, IconX } from "@tabler/icons-react";
import { MatchTeamsRow } from "@/components/team/match-teams-row";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMatchPredictionsSummary,
  type MatchPredictionsSummaryRow,
} from "@/server/actions/predictions";

function formatPrediction(
  homeScore: number | null,
  awayScore: number | null,
): string {
  if (homeScore == null || awayScore == null) return "—";
  return `${homeScore} : ${awayScore}`;
}

function formatPoints(points: number | null, resultPending: boolean): string {
  if (resultPending) return "—";
  if (points == null || points === 0) return "0";
  return `+${points}`;
}

function SummaryRow({
  row,
  resultPending,
}: {
  row: MatchPredictionsSummaryRow;
  resultPending: boolean;
}) {
  const hasPrediction = row.homeScore != null && row.awayScore != null;
  const won = !resultPending && (row.points ?? 0) > 0;

  return (
    <tr
      className={cn(
        "border-t border-brand-neutral/60",
        row.isCurrentUser && "bg-brand-lime/10",
      )}
    >
      <td
        className={cn(
          "px-3 py-2.5 align-middle",
          row.isCurrentUser ? "font-medium text-brand-lime" : "text-white",
        )}
      >
        <span className="line-clamp-2 break-words">
          {row.isCurrentUser ? "Вы" : row.displayName}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center align-middle tabular-nums text-white">
        {hasPrediction ? (
          formatPrediction(row.homeScore, row.awayScore)
        ) : (
          <span className="text-brand-muted">Не сделан</span>
        )}
      </td>
      <td
        className={cn(
          "px-3 py-2.5 text-right align-middle font-semibold tabular-nums",
          won ? "text-brand-lime" : "text-brand-muted",
        )}
      >
        {formatPoints(row.points, resultPending)}
      </td>
    </tr>
  );
}

function SummaryTable({
  rows,
  resultPending,
}: {
  rows: MatchPredictionsSummaryRow[];
  resultPending: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-brand-muted">
        В турнире пока нет участников.
      </p>
    );
  }

  const withPrediction = rows.filter(
    (row) => row.homeScore != null && row.awayScore != null,
  );

  if (withPrediction.length === 0) {
    return (
      <p className="py-8 text-center text-sm leading-relaxed text-brand-muted">
        Никто не сделал прогноз на этот матч.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[280px] text-xs sm:text-sm">
        <thead className="text-brand-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Участник</th>
            <th className="px-3 py-2 text-center font-medium">Прогноз</th>
            <th className="px-3 py-2 text-right font-medium">Очки</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SummaryRow
              key={row.userId}
              row={row}
              resultPending={resultPending}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FinishedMatchPredictionsButton({
  gameRouteParam,
  matchId,
  homeTeam,
  awayTeam,
  platformView = false,
  className,
}: {
  gameRouteParam: string;
  matchId: string;
  homeTeam: { name: string; countryCode?: string | null };
  awayTeam: { name: string; countryCode?: string | null };
  platformView?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MatchPredictionsSummaryRow[]>([]);
  const [resultPending, setResultPending] = useState(false);
  const [actualScore, setActualScore] = useState<{
    home: number | null;
    away: number | null;
  } | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadSummary = () => {
    if (loadedFor === matchId) return;
    startTransition(async () => {
      setError(null);
      try {
        const data = await getMatchPredictionsSummary(
          gameRouteParam,
          matchId,
          platformView,
        );
        if (!data) {
          setError("Не удалось загрузить прогнозы");
          return;
        }
        setRows(data.rows);
        setResultPending(data.resultPending);
        setActualScore({ home: data.actualHome, away: data.actualAway });
        setLoadedFor(matchId);
      } catch {
        setError("Не удалось загрузить прогнозы");
      }
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) loadSummary();
  };

  const scoreLabel =
    actualScore?.home != null && actualScore?.away != null
      ? ` · ${actualScore.home} : ${actualScore.away}`
      : "";

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        type="button"
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-brand-neutral/60 hover:text-brand-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime active:bg-brand-neutral/80 sm:size-7 sm:rounded-md",
          className,
        )}
        aria-label="Прогнозы всех участников"
        title="Прогнозы всех участников"
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
              Прогнозы участников
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 space-y-1 text-xs sm:text-sm">
              <MatchTeamsRow
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                className="text-white/90"
              />
              {scoreLabel ? (
                <span className="block text-brand-muted">
                  Итог{scoreLabel}
                </span>
              ) : resultPending ? (
                <span className="block text-brand-muted">
                  Ожидаем официальный результат
                </span>
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-3 sm:px-2 [-webkit-overflow-scrolling:touch]">
          {pending && loadedFor !== matchId ? (
            <p className="py-8 text-center text-sm text-brand-muted">Загрузка…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-400">{error}</p>
          ) : (
            <SummaryTable rows={rows} resultPending={resultPending} />
          )}
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
