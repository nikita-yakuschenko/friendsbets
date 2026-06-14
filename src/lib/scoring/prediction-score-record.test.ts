import { describe, expect, it } from "vitest";
import {
  pickCanonicalPredictionScore,
  sumPredictionScorePoints,
} from "@/lib/scoring/prediction-score-record";

describe("prediction-score-record", () => {
  it("берёт самую свежую запись при дублях", () => {
    const canonical = pickCanonicalPredictionScore([
      {
        id: "old",
        points: 1,
        reason: "Голы одной команды",
        calculatedAt: new Date("2026-06-14T13:00:00Z"),
      },
      {
        id: "new",
        points: 4,
        reason: "Исход и голы одной команды",
        calculatedAt: new Date("2026-06-14T16:11:00Z"),
      },
    ]);

    expect(canonical?.id).toBe("new");
    expect(sumPredictionScorePoints([
      {
        id: "old",
        points: 1,
        reason: "Голы одной команды",
        calculatedAt: new Date("2026-06-14T13:00:00Z"),
      },
      {
        id: "new",
        points: 4,
        reason: "Исход и голы одной команды",
        calculatedAt: new Date("2026-06-14T16:11:00Z"),
      },
    ])).toBe(4);
  });
});
