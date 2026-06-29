import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseChampionatMatchPageHtml } from "@/lib/football-api/championat/match-details";

const liveFixture = readFileSync(
  join(process.cwd(), "tests/fixtures/championat-match-live-mexico.html"),
  "utf8",
);

describe("parseChampionatMatchPageHtml", () => {
  it("читает счёт из match-info__score-total", () => {
    const details = parseChampionatMatchPageHtml(liveFixture);
    expect(details.homeScore).toBe(2);
    expect(details.awayScore).toBe(0);
  });

  it("не путает время начала 22:00 со счётом", () => {
    const html = `
      <div class="match-info__status">1-й тайм, 5'</div>
      <div class="match-info__title">12 июня 2026, пятница. 22:00 МСК</div>
      <div class="match-info__score-total">0 : 0</div>
    `;
    const details = parseChampionatMatchPageHtml(html);
    expect(details.homeScore).toBe(0);
    expect(details.awayScore).toBe(0);
  });

  it("отклоняет 22:00 из fallback-блока тайма", () => {
    const html = `
      <div class="match-info__status">1-й тайм, 5'</div>
      <div class="match-info__title">12 июня 2026, пятница. 22:00 МСК</div>
    `;
    const details = parseChampionatMatchPageHtml(html);
    expect(details.homeScore).toBeUndefined();
    expect(details.awayScore).toBeUndefined();
  });

  it("читает пенальти из match-info__score-extra", () => {
    const html = `
      <div class="match-info__score-total">1 : 1</div>
      <div class="match-info__score-extra">3 : 4</div>
    `;
    const details = parseChampionatMatchPageHtml(html);
    expect(details.homePenaltyScore).toBe(3);
    expect(details.awayPenaltyScore).toBe(4);
  });
});
