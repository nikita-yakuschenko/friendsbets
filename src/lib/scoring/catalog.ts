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

const TIER_DETAILS: Record<Exclude<ScoreTier, "none">, string> = {
  exact: "Совпали голы хозяев и гостей — угадан точный счёт матча.",
  outcome_and_diff:
    "Угадан исход (победа / ничья / поражение) и та же разница мячей, что в матче.",
  outcome_and_team_goals:
    "Угадан исход и число голов хотя бы у одной из команд (хозяева или гости).",
  outcome: "Угадан только исход матча — кто выиграл или была ли ничья.",
  team_goals:
    "Исход не угадан, но совпало число голов у одной из команд.",
};

export const SCORING_RULE_SUMMARIES: Record<string, string> = {
  FOOTBALL_CLASSIC:
    "Простая классика: главное — точный счёт, за верный исход тоже дают очки.",
  MANY_POINTS:
    "Щедрая шкала до 6 очков: чем ближе прогноз к реальности, тем больше награда.",
  DIFFERENCE_DECIDES:
    "Разница мячей решает: после точного счёта важнее угадать исход вместе с разницей.",
  DRY_NUMBERS:
    "Сбалансированная схема: точный счёт ценится выше, но очки можно набрать и частичными попаданиями.",
};

export type ScoringRuleDescriptionItem = {
  points: number;
  shortLabel: string;
  label: string;
  detail: string;
};

export type ScoringRuleDescription = {
  summary: string;
  items: ScoringRuleDescriptionItem[];
};

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

export function getScoringRuleDescription(code: string): ScoringRuleDescription {
  const summary =
    SCORING_RULE_SUMMARIES[code] ??
    "За каждый матч начисляется один лучший подходящий вариант из списка ниже.";

  const columns = getLeaderboardColumns(code);
  const points =
    TIER_POINTS_BY_RULE[code] ?? TIER_POINTS_BY_RULE.FOOTBALL_CLASSIC;

  const items = columns
    .filter((col): col is LeaderboardColumn & { tier: Exclude<ScoreTier, "none"> } =>
      col.tier !== "none",
    )
    .map((col) => ({
      points: points[col.tier] ?? 0,
      shortLabel: col.shortLabel,
      label: col.label,
      detail: TIER_DETAILS[col.tier],
    }))
    .sort((a, b) => b.points - a.points);

  return { summary, items };
}

export function getScoringRuleHint(code: string): string {
  return getScoringRuleDescription(code).summary;
}

/** @deprecated Use getScoringRuleLegendItems */
export function getScoringRulePointsLegend(code: string): string[] {
  return getScoringRuleLegendItems(code).map(
    (item) => `${item.points} — ${item.shortLabel}, ${item.label.toLowerCase()}`,
  );
}
