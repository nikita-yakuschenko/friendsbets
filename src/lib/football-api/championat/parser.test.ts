import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { parseChampionatCalendarHtml } from "@/lib/football-api/championat/parser";
import { parseChampionatLiveStatusFromHtml } from "@/lib/football-api/championat/match-live-status";

const fixturesDir = join(process.cwd(), "tests/fixtures");

describe("Championat parser", () => {
  const html = readFileSync(
    join(fixturesDir, "championat-calendar-snippet.html"),
    "utf8",
  );

  it("парсит завершённый матч со счётом", () => {
    const matches = parseChampionatCalendarHtml(html);
    const finished = matches.find((m) => m.externalId.endsWith("1291304"));
    expect(finished).toBeDefined();
    expect(finished!.homeScore).toBe(3);
    expect(finished!.awayScore).toBe(1);
    expect(finished!.status).toBe(MatchStatus.FINISHED);
    expect(finished!.homeTeam.name).toContain("Ривер");
  });

  it("парсит будущий матч без счёта", () => {
    const matches = parseChampionatCalendarHtml(html);
    const upcoming = matches.find((m) => m.externalId.endsWith("1310928"));
    expect(upcoming?.homeScore).toBeUndefined();
    expect(upcoming?.status).toBe(MatchStatus.SCHEDULED);
  });

  it("помечает перенесённый матч", () => {
    const matches = parseChampionatCalendarHtml(html);
    const postponed = matches.find((m) => m.externalId.endsWith("1310924"));
    expect(postponed?.status).toBe(MatchStatus.POSTPONED);
  });

  it("не считает preview «трансляцию» за live без счёта", () => {
    const preview = readFileSync(
      join(fixturesDir, "championat-match-preview.html"),
      "utf8",
    );
    expect(parseChampionatLiveStatusFromHtml(preview).phase).toBe("scheduled");
  });
});
