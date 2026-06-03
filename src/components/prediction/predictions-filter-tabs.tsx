import Link from "next/link";
import { gamePath } from "@/lib/game-path";
import {
  PREDICTIONS_FILTER_LABELS,
  PREDICTIONS_FILTER_IDS,
  type PredictionsFilterId,
} from "@/lib/predictions-match-filter";
import { cn } from "@/lib/utils";

export function PredictionsFilterTabs({
  inviteCode,
  activeFilter,
  counts,
}: {
  inviteCode: string;
  activeFilter: PredictionsFilterId;
  counts: Record<PredictionsFilterId, number>;
}) {
  return (
    <nav
      className="mb-6 flex w-full max-w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-brand-neutral bg-brand-surface/50 p-1 scrollbar-none"
      aria-label="Фильтр матчей"
    >
      {PREDICTIONS_FILTER_IDS.map((id) => {
        const active = id === activeFilter;
        const count = counts[id];
        return (
          <Link
            key={id}
            href={`${gamePath(inviteCode, "predictions")}?view=${id}`}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm",
              active
                ? "bg-brand-lime text-black"
                : "text-brand-muted hover:bg-brand-neutral/30 hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            {PREDICTIONS_FILTER_LABELS[id]}
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                active ? "text-black/70" : "text-brand-muted",
              )}
            >
              ({count})
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
