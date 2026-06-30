import { getPenaltyScoringModeNote } from "@/lib/scoring/penalty-scoring-mode";

export function PredictionRulesNote({
  championBetEnabled,
  championBetPoints,
  penaltyScoringSynthetic = false,
}: {
  championBetEnabled?: boolean;
  championBetPoints?: number | null;
  penaltyScoringSynthetic?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-brand-neutral/80 bg-brand-bg/50 px-4 py-3 text-sm leading-relaxed text-brand-muted"
      role="note"
    >
      <p>
        В матчах плей-офф ничья в прогнозе недопустима — укажите счёт с
        победителем.
      </p>
      <p className="mt-2">{getPenaltyScoringModeNote(penaltyScoringSynthetic)}</p>
      {championBetEnabled ? (
        <p className="mt-2">
          До начала плей-офф нужно выбрать чемпиона турнира из команд,
          вышедших в плей-офф
          {championBetPoints != null
            ? ` (${championBetPoints} очк. за верный прогноз)`
            : ""}
          .
        </p>
      ) : null}
    </div>
  );
}
