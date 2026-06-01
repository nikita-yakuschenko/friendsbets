import { getScoringRuleDescription } from "@/lib/scoring/catalog";

export function ScoringRuleDescription({ code }: { code: string }) {
  const { summary, items } = getScoringRuleDescription(code);

  return (
    <div
      className="rounded-xl border border-brand-neutral/80 bg-brand-bg/50 px-4 py-3"
      role="note"
    >
      <p className="text-sm leading-relaxed text-brand-muted">{summary}</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.shortLabel} className="flex gap-3 text-sm">
            <span className="w-7 shrink-0 pt-0.5 text-right font-semibold tabular-nums text-brand-lime">
              {item.points}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-white">
                {item.label}{" "}
                <span className="font-normal text-brand-muted">({item.shortLabel})</span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-brand-neutral/60 pt-3 text-xs leading-relaxed text-brand-muted">
        За один матч засчитывается только один вариант — с наибольшим числом очков из
        подходящих.
      </p>
    </div>
  );
}
