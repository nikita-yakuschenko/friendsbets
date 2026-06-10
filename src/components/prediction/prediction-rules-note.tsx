export function PredictionRulesNote({
  championBetEnabled,
  championBetPoints,
}: {
  championBetEnabled?: boolean;
  championBetPoints?: number | null;
}) {
  return (
    <div
      className="rounded-xl border border-brand-neutral/80 bg-brand-bg/50 px-4 py-3 text-sm leading-relaxed text-brand-muted"
      role="note"
    >
      <p>
        В матчах плей-офф ничья невозможна — укажите счёт с победителем (при
        равенстве после основного времени учитывается исход по пенальти на
        поле).
      </p>
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
