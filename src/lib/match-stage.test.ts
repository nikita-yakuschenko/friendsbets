import { describe, expect, it } from "vitest";
import { isFinalStage, isGroupStage, isKnockoutStage } from "@/lib/match-stage";

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

  it("финал — только матч «Финал», не 1/8 финала", () => {
    expect(isFinalStage("Финал")).toBe(true);
    expect(isFinalStage("final")).toBe(true);
    expect(isFinalStage("1/8 финала")).toBe(false);
    expect(isFinalStage("1/2 финала")).toBe(false);
    expect(isFinalStage("1/16 финала")).toBe(false);
  });
});
