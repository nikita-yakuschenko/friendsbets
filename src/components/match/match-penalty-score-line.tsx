import { formatMatchPenaltyScore } from "@/lib/match-penalty-display";
import { cn } from "@/lib/utils";

export function MatchPenaltyScoreLine({
  homePenaltyScore,
  awayPenaltyScore,
  className,
}: {
  homePenaltyScore: number;
  awayPenaltyScore: number;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-center text-xs tabular-nums text-brand-muted",
        className,
      )}
      aria-label={`Серия пенальти ${formatMatchPenaltyScore(homePenaltyScore, awayPenaltyScore)}`}
    >
      пен. {formatMatchPenaltyScore(homePenaltyScore, awayPenaltyScore)}
    </p>
  );
}
