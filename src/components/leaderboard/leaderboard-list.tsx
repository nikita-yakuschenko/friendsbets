import { ParticipantChampionFlag } from "@/components/leaderboard/participant-champion-flag";
import { PointsHistoryButton } from "@/components/leaderboard/points-history-button";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import type { LeaderboardColumn, ScoringRuleLegendItem } from "@/lib/scoring/catalog";
import { getPenaltyScoringModeNote } from "@/lib/scoring/penalty-scoring-mode";
import type { ScoreTier } from "@/lib/scoring/rules";

export type LeaderboardRow = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  updatedAt: Date | string | number;
  championBetCountryCode?: string | null;
  rank: number;
  totalPoints: number;
  predictionsCount: number;
  totalMatches: number;
  tierCounts: Record<ScoreTier, number>;
};

function LeaderboardRowStats({
  row,
  columns,
}: {
  row: LeaderboardRow;
  columns: LeaderboardColumn[];
}) {
  return (
    <span className="mt-1 block space-y-0.5 text-[11px] leading-snug text-brand-muted sm:hidden">
      <span className="block">
        Прогнозов: {row.predictionsCount} из {row.totalMatches}
      </span>
      <span className="block">
        {columns
          .map(
            (column) =>
              `${column.shortLabel}:${row.tierCounts[column.tier] ?? 0}`,
          )
          .join(" · ")}
      </span>
    </span>
  );
}

export function LeaderboardTable({
  rows,
  columns,
  currentUserId,
  gameRouteParam,
  platformView = false,
}: {
  rows: LeaderboardRow[];
  columns: LeaderboardColumn[];
  currentUserId: string;
  gameRouteParam: string;
  platformView?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-neutral bg-brand-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-xs sm:text-sm">
          <thead className="border-b border-brand-neutral/60 bg-brand-bg text-brand-muted">
            <tr>
              <th className="w-10 px-3 py-2.5 text-left font-medium sm:px-4 sm:py-3">
                #
              </th>
              <th className="px-3 py-2.5 text-left font-medium sm:px-4 sm:py-3">
                Участник
              </th>
              <th className="hidden px-3 py-2.5 text-left font-medium sm:table-cell sm:px-4 sm:py-3">
                Прогнозы
              </th>
              {columns.map((column) => (
                <th
                  key={column.tier}
                  title={column.label}
                  className="hidden w-10 px-2 py-2.5 text-center font-medium sm:table-cell sm:px-3 sm:py-3"
                >
                  {column.shortLabel}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium sm:px-4 sm:py-3">
                Очки
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrent = row.userId === currentUserId;
              return (
                <tr
                  key={row.userId}
                  className={cn(
                    "border-t border-brand-neutral/60",
                    isCurrent && "bg-brand-lime/10",
                  )}
                >
                  <td className="px-3 py-2.5 font-bold tabular-nums text-brand-lime sm:px-4 sm:py-3">
                    {row.rank}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        name={row.displayName}
                        avatarUrl={row.avatarUrl}
                        updatedAt={row.updatedAt}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "block truncate font-medium",
                            isCurrent ? "text-white" : "text-brand-muted",
                          )}
                          title={row.displayName}
                        >
                          {row.displayName}
                          <ParticipantChampionFlag
                            countryCode={row.championBetCountryCode}
                          />
                        </span>
                        <LeaderboardRowStats row={row} columns={columns} />
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 tabular-nums text-brand-muted sm:table-cell sm:px-4 sm:py-3">
                    {row.predictionsCount} из {row.totalMatches}
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.tier}
                      title={column.label}
                      className="hidden px-2 py-2.5 text-center tabular-nums text-brand-muted sm:table-cell sm:px-3 sm:py-3"
                    >
                      {row.tierCounts[column.tier] ?? 0}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex min-w-[4.5rem] items-center justify-end gap-0.5 sm:min-w-0 sm:gap-1">
                      <span className="font-semibold tabular-nums text-brand-lime">
                        {row.totalPoints}
                      </span>
                      <PointsHistoryButton
                        gameRouteParam={gameRouteParam}
                        userId={row.userId}
                        displayName={row.displayName}
                        platformView={platformView}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LeaderboardScoringLegend({
  scoringRuleTitle,
  legendItems,
  penaltyScoringSynthetic = false,
}: {
  scoringRuleTitle: string;
  legendItems: ScoringRuleLegendItem[];
  penaltyScoringSynthetic?: boolean;
}) {
  return (
    <div
      className="mb-4 rounded-xl border border-brand-neutral bg-brand-surface px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      role="note"
    >
      <p className="text-brand-muted">
        Вариант начисления очков:{" "}
        <span className="font-medium text-white">{scoringRuleTitle}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-xs leading-snug text-brand-muted">
        {legendItems.map((item) => (
          <span
            key={item.shortLabel}
            className="inline-flex shrink-0 whitespace-nowrap items-baseline"
          >
            <span className="font-semibold tabular-nums text-brand-lime">
              {item.points}
            </span>
            <span className="ml-1 font-medium text-white/90">{item.shortLabel}</span>
            <span className="ml-1 text-brand-muted/90">— {item.label.toLowerCase()}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 border-t border-brand-neutral/60 pt-3 text-xs leading-relaxed text-brand-muted">
        {getPenaltyScoringModeNote(penaltyScoringSynthetic)}
      </p>
    </div>
  );
}
