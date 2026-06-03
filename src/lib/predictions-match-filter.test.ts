import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { matchPredictionsFilter } from "@/lib/predictions-match-filter";

const base = {
  startsAt: new Date("2026-12-01T00:00:00Z"),
  homeScore: null,
  awayScore: null,
};

describe("matchPredictionsFilter", () => {
  it("включает перенесённые во «Все»", () => {
    expect(
      matchPredictionsFilter({ ...base, status: MatchStatus.POSTPONED }, "all"),
    ).toBe(true);
  });

  it("исключает перенесённые из предстоящих", () => {
    expect(
      matchPredictionsFilter({ ...base, status: MatchStatus.POSTPONED }, "upcoming"),
    ).toBe(false);
  });

  it("показывает только перенесённые на вкладке postponed", () => {
    expect(
      matchPredictionsFilter({ ...base, status: MatchStatus.POSTPONED }, "postponed"),
    ).toBe(true);
    expect(
      matchPredictionsFilter({ ...base, status: MatchStatus.SCHEDULED }, "postponed"),
    ).toBe(false);
  });

  it("включает FINISHED в завершённые", () => {
    expect(
      matchPredictionsFilter({ ...base, status: MatchStatus.FINISHED }, "finished"),
    ).toBe(true);
  });
});
