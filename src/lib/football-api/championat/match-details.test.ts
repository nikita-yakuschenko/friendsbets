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
});
