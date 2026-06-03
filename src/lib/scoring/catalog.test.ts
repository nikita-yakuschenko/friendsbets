import { describe, expect, it } from "vitest";
import {
  getLeaderboardColumns,
  getScoringRuleDescription,
  getScoringRuleLegendItems,
} from "@/lib/scoring/catalog";

describe("scoring catalog", () => {
  it("возвращает колонки для FOOTBALL_CLASSIC", () => {
    const cols = getLeaderboardColumns("FOOTBALL_CLASSIC");
    expect(cols.map((c) => c.tier)).toEqual(["exact", "outcome"]);
  });

  it("возвращает легенду MANY_POINTS", () => {
    const items = getScoringRuleLegendItems("MANY_POINTS");
    expect(items[0]?.points).toBe(6);
  });

  it("описание содержит пункты по убыванию очков", () => {
    const desc = getScoringRuleDescription("DRY_NUMBERS");
    expect(desc.items[0]!.points).toBeGreaterThanOrEqual(desc.items[1]!.points);
  });
});
