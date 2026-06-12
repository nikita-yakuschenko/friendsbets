import { describe, expect, it } from "vitest";
import { buildFinishedMatchPredictionsUrl } from "@/lib/finished-live-match-redirect";

describe("buildFinishedMatchPredictionsUrl", () => {
  it("ведёт на завершённые прогнозы с якорем матча", () => {
    expect(buildFinishedMatchPredictionsUrl("9ZNOKZ", "cmpz5hzld00094xlnap1tq6km")).toBe(
      "/game/9ZNOKZ/predictions?view=finished#match-cmpz5hzld00094xlnap1tq6km",
    );
  });

  it("сохраняет режим platform", () => {
    expect(
      buildFinishedMatchPredictionsUrl("9ZNOKZ", "match-1", {
        platformView: true,
      }),
    ).toBe("/game/9ZNOKZ/predictions?view=finished&as=platform#match-match-1");
  });
});
