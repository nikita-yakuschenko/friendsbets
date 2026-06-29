import Link from "next/link";
import { ParticipantChampionFlag } from "@/components/leaderboard/participant-champion-flag";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MiniLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  totalPoints: number;
  championBetCountryCode?: string | null;
};

export function MiniLeaderboard({
  rows,
  currentUserId,
  fill = false,
  detailsHref,
}: {
  rows: MiniLeaderboardRow[];
  currentUserId: string;
  fill?: boolean;
  detailsHref?: string;
}) {
  if (rows.length === 0) {
    return (
      <p
        className={cn(
          "text-sm text-brand-muted",
          fill && "flex flex-1 items-center justify-center p-4",
        )}
      >
        Пока нет участников.
      </p>
    );
  }

  return (
    <div
      className={cn(
        fill ? "flex h-full min-h-0 flex-col" : "w-full overflow-hidden rounded-xl border border-brand-neutral/60",
      )}
    >
      <div
        className={cn(
          "grid shrink-0 grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-1.5 border-b border-brand-neutral/60 bg-brand-bg/80 px-3 py-1.5 text-[11px] uppercase tracking-wide text-brand-muted",
          fill && "px-3",
        )}
      >
        <span aria-hidden="true" />
        <span>Участник</span>
        <span className="text-right">Очки</span>
      </div>
      <div className={cn(fill && "min-h-0 flex-1")}>
        {rows.map((row) => {
          const isCurrent = row.userId === currentUserId;
          return (
            <div
              key={row.userId}
              className={cn(
                "grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] items-center gap-1.5 border-b border-brand-neutral/40 px-3 py-1 text-xs last:border-0",
                isCurrent && "bg-brand-lime/10",
              )}
            >
              <span className="font-semibold text-brand-lime">{row.rank}</span>
              <span
                className={cn(
                  "truncate",
                  isCurrent ? "font-medium text-white" : "text-brand-muted",
                )}
                title={row.displayName}
              >
                {row.displayName}
                <ParticipantChampionFlag
                  countryCode={row.championBetCountryCode}
                />
              </span>
              <span className="text-right font-semibold tabular-nums text-white">
                {row.totalPoints}
              </span>
            </div>
          );
        })}
      </div>
      {detailsHref && (
        <div className="shrink-0 border-t border-brand-neutral/60 px-3 py-1.5">
          <Link href={detailsHref} className="block">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 min-h-7 w-full px-2 text-xs text-brand-muted hover:text-white"
            >
              Подробнее
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
