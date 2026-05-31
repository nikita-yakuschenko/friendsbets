import type { ScoreTier } from "@/lib/scoring/rules";

export type LeaderboardColumn = {
  tier: ScoreTier;
  /** Full name for tooltips and legend. */
  label: string;
  /** Short column header (ТС, ИР, …). */
  shortLabel: string;
};

const TIER_LABELS: Record<
  ScoreTier,
  { label: string; shortLabel: string } | undefined
> = {
  exact: { label: "Точный счёт", shortLabel: "ТС" },
  outcome_and_diff: { label: "Исход и разница", shortLabel: "ИР" },
  outcome_and_team_goals: { label: "Исход и голы", shortLabel: "ИГ" },
  outcome: { label: "Исход", shortLabel: "ИС" },
  team_goals: { label: "Голы команды", shortLabel: "ГК" },
  none: undefined,
};

function column(tier: Exclude<ScoreTier, "none">): LeaderboardColumn {
  const meta = TIER_LABELS[tier]!;
  return { tier, label: meta.label, shortLabel: meta.shortLabel };
}

const LEADERBOARD_COLUMNS_BY_RULE: Record<string, LeaderboardColumn[]> = {
  FOOTBALL_CLASSIC: [column("exact"), column("outcome")],
  MANY_POINTS: [
    column("exact"),
    column("outcome_and_diff"),
    column("outcome_and_team_goals"),
    column("outcome"),
    column("team_goals"),
  ],
  DIFFERENCE_DECIDES: [
    column("exact"),
    column("outcome_and_diff"),
    column("outcome"),
  ],
  DRY_NUMBERS: [
    column("exact"),
    column("outcome_and_team_goals"),
    column("outcome"),
    column("team_goals"),
  ],
};

export const SCORING_RULE_HINTS: Record<string, string> = {
  FOOTBALL_CLASSIC: "3 очка за точный счёт, 1 — за исход",
  MANY_POINTS:
    "До 6 очков: точный счёт, исход с разницей, исход с голами команды, исход, голы одной команды",
  DIFFERENCE_DECIDES: "3 — точный счёт, 2 — исход и разница, 1 — исход",
  DRY_NUMBERS:
    "4 — точный счёт, 3 — исход и голы команды, 2 — исход, 1 — голы одной команды",
};

export function getScoringRuleHint(code: string): string {
  return SCORING_RULE_HINTS[code] ?? "Стандартные правила начисления очков";
}

export function getLeaderboardColumns(code: string): LeaderboardColumn[] {
  return (
    LEADERBOARD_COLUMNS_BY_RULE[code] ?? LEADERBOARD_COLUMNS_BY_RULE.FOOTBALL_CLASSIC
  );
}

const TIER_POINTS_BY_RULE: Record<
  string,
  Partial<Record<Exclude<ScoreTier, "none">, number>>
> = {
  FOOTBALL_CLASSIC: { exact: 3, outcome: 1 },
  MANY_POINTS: {
    exact: 6,
    outcome_and_diff: 5,
    outcome_and_team_goals: 4,
    outcome: 3,
    team_goals: 1,
  },
  DIFFERENCE_DECIDES: { exact: 3, outcome_and_diff: 2, outcome: 1 },
  DRY_NUMBERS: {
    exact: 4,
    outcome_and_team_goals: 3,
    outcome: 2,
    team_goals: 1,
  },
};

export type ScoringRuleLegendItem = {
  points: number;
  shortLabel: string;
  label: string;
};

export function getScoringRuleLegendItems(code: string): ScoringRuleLegendItem[] {
  const columns = getLeaderboardColumns(code);
  const points =
    TIER_POINTS_BY_RULE[code] ?? TIER_POINTS_BY_RULE.FOOTBALL_CLASSIC;
  return columns.map((col) => ({
    points: points[col.tier as Exclude<ScoreTier, "none">] ?? 0,
    shortLabel: col.shortLabel,
    label: col.label,
  }));
}

/** @deprecated Use getScoringRuleLegendItems */
export function getScoringRulePointsLegend(code: string): string[] {
  return getScoringRuleLegendItems(code).map(
    (item) => `${item.points} — ${item.shortLabel}, ${item.label.toLowerCase()}`,
  );
}
