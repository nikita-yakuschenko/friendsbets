import {
  formatPointsScoringScore,
  resolvePointsScoringScore,
  type MatchForPenaltyScoring,
} from "@/lib/scoring/penalty-scoring-mode";
import { cn } from "@/lib/utils";

export function MatchPointsScoringScoreLine({
  match,
  penaltyScoringSynthetic,
  className,
  align = "center",
}: {
  match: MatchForPenaltyScoring;
  penaltyScoringSynthetic: boolean;
  className?: string;
  align?: "center" | "start";
}) {
  const scoring = resolvePointsScoringScore(match, penaltyScoringSynthetic);
  if (!scoring) return null;

  return (
    <p
      className={cn(
        "text-xs leading-snug text-brand-lime/90",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      Для очков:{" "}
      <span className="font-medium tabular-nums text-brand-lime">
        {formatPointsScoringScore(scoring.homeScore, scoring.awayScore)}
      </span>
    </p>
  );
}
