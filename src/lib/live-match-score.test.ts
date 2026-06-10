import { describe, expect, it } from "vitest";
import {
  formatLiveScoreLine,
  liveScoreForDisplay,
} from "@/lib/live-match-score";

describe("live match score display", () => {
  it("null → 0 для идущего матча", () => {
    expect(liveScoreForDisplay(null)).toBe(0);
    expect(liveScoreForDisplay(undefined)).toBe(0);
    expect(formatLiveScoreLine(null, null)).toEqual({
      home: 0,
      away: 0,
      text: "0 : 0",
    });
  });

  it("сохраняет ненулевой счёт", () => {
    expect(formatLiveScoreLine(1, 1)).toEqual({
      home: 1,
      away: 1,
      text: "1 : 1",
    });
  });
});
