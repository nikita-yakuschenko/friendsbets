import { formatMatchPenaltyScore } from "@/lib/match-penalty-display";
import { cn } from "@/lib/utils";

export function MatchPenaltyScoreLine({
  homePenaltyScore,
  awayPenaltyScore,
  className,
  compact = false,
}: {
  homePenaltyScore: number;
  awayPenaltyScore: number;
  className?: string;
  /** Короткая подпись под счётом в карточке матча. */
  compact?: boolean;
}) {
  const score = formatMatchPenaltyScore(homePenaltyScore, awayPenaltyScore);
  const label = compact ? `пен. ${score}` : `Серия пенальти: ${score}`;

  return (
    <p
      className={cn(
        "text-center text-xs tabular-nums text-brand-muted",
        className,
      )}
      aria-label={`Серия пенальти ${score}`}
    >
      {label}
    </p>
  );
}