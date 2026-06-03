import { IconPlayerPause } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  formatLiveBadgeLabel,
  liveBadgeVariantFromStatus,
  type ChampionatLiveStatus,
} from "@/lib/football-api/championat/match-live-status";
import { cn } from "@/lib/utils";

const defaultLiveStatus: ChampionatLiveStatus = {
  phase: "live",
  rawText: "",
};

export function LiveBadge({
  status = defaultLiveStatus,
}: {
  status?: ChampionatLiveStatus;
}) {
  const variant = liveBadgeVariantFromStatus(status);
  const label = formatLiveBadgeLabel(status);
  const longLabel = label.length > 14;

  if (variant === "halftime") {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "max-w-full gap-1.5 px-2.5 py-0.5 font-semibold uppercase tracking-wide",
          longLabel ? "text-[10px]" : "text-[11px]",
          "border-brand-neutral/60 bg-brand-neutral/25 text-brand-muted",
        )}
      >
        <IconPlayerPause
          size={14}
          stroke={2}
          className="shrink-0 live-pulse-icon"
          aria-hidden
        />
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "max-w-full gap-1.5 px-2.5 py-0.5 font-semibold uppercase tracking-wide",
        longLabel ? "text-[10px]" : "text-[11px]",
        "border-brand-lime/40 bg-brand-lime/15 text-brand-lime",
      )}
    >
      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lime live-pulse-dot" />
      {label}
    </Badge>
  );
}
