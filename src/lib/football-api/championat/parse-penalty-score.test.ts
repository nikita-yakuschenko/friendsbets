import { describe, expect, it } from "vitest";
import { parseChampionatPenaltyScoreFromHtml } from "@/lib/football-api/championat/parse-penalty-score";

describe("parseChampionatPenaltyScoreFromHtml", () => {
  it("читает серию пенальти из match-info__score-extra", () => {
    const html = `
      <div class="match-info__score-main">
        <div class="match-info__score-total">1 : 1</div>
        <div class="match-info__score-extra">3 : 4</div>
      </div>
    `;

    expect(parseChampionatPenaltyScoreFromHtml(html)).toEqual({
      homePenaltyScore: 3,
      awayPenaltyScore: 4,
    });
  });

  it("возвращает null если блока пенальти нет", () => {
    const html = `
      <div class="match-info__score-main">
        <div class="match-info__score-total">2 : 0</div>
      </div>
    `;

    expect(parseChampionatPenaltyScoreFromHtml(html)).toBeNull();
  });
});
