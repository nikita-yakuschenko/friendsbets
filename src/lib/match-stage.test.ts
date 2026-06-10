import { describe, expect, it } from "vitest";
import { isGroupStage, isKnockoutStage } from "@/lib/match-stage";

describe("match stage", () => {
  it("группа — не плей-офф", () => {
    expect(isGroupStage("Группа A · Тур 2")).toBe(true);
    expect(isKnockoutStage("Группа A · Тур 2")).toBe(false);
  });

  it("плей-офф", () => {
    expect(isKnockoutStage("1/16 финала")).toBe(true);
    expect(isKnockoutStage("Финал")).toBe(true);
    expect(isGroupStage("1/16 финала")).toBe(false);
  });
});
