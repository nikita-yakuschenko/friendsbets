import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { fetchChampionatHtml } from "@/lib/football-api/championat/fetch-html";
import {
  championatMatchPageUrl,
  extractChampionatMatchId,
} from "@/lib/football-api/championat/match-details";
import type {
  ChampionatMatchEvent,
  ChampionatMatchEventSection,
  ChampionatMatchEventType,
} from "@/lib/football-api/championat/match-protocol-types";

export type {
  ChampionatMatchEvent,
  ChampionatMatchEventSection,
  ChampionatMatchEventType,
} from "@/lib/football-api/championat/match-protocol-types";
export { CHAMPIONAT_EVENT_LABELS } from "@/lib/football-api/championat/match-protocol-types";

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseMinute(raw: string): { label: string; minute: number | null } {
  const text = normalizeWhitespace(raw);
  const stoppage = text.match(/^(\d+)\s*\+\s*(\d+)\s*[''′]?/);
  if (stoppage) {
    const base = Number(stoppage[1]);
    const added = Number(stoppage[2]);
    return {
      label: `${base}+${added}'`,
      minute: base + added / 100,
    };
  }
  const match = text.match(/^(\d+)\s*[''′]?/);
  const minute = match ? Number(match[1]) : null;
  const label = minute != null ? `${minute}'` : text;
  return { label, minute };
}

function mapGoalType(title: string | undefined): ChampionatMatchEventType {
  const t = (title ?? "гол").toLowerCase();
  if (t.includes("пеналь")) return "PENALTY_GOAL";
  if (t.includes("авто")) return "OWN_GOAL";
  return "GOAL";
}

function mapCardType(iconClass: string): ChampionatMatchEventType {
  if (iconClass.includes("_red")) return "RED_CARD";
  if (iconClass.includes("_yellow")) return "YELLOW_CARD";
  return "UNKNOWN";
}

function parseRowMinute(
  $: CheerioAPI,
  row: Parameters<CheerioAPI>[0],
): { label: string; minute: number | null } {
  const $row = $(row);
  const minuteDiv = $row.find(".match-stat__main-value > div").first();
  const raw = minuteDiv.length
    ? normalizeWhitespace(minuteDiv.text())
    : normalizeWhitespace($row.find(".match-stat__main-value").first().text());
  return parseMinute(raw);
}

function sortProtocolEvents(events: ChampionatMatchEvent[]): ChampionatMatchEvent[] {
  return [...events].sort((a, b) => {
    const ma = a.minute ?? 9999;
    const mb = b.minute ?? 9999;
    if (ma !== mb) return ma - mb;
    return a.playerName.localeCompare(b.playerName, "ru");
  });
}

function parseProtocolSection(
  $: CheerioAPI,
  h2Title: string,
  section: ChampionatMatchEventSection,
): ChampionatMatchEvent[] {
  const events: ChampionatMatchEvent[] = [];
  const h2 = $("h2.tournament-title")
    .filter((_, el) => normalizeWhitespace($(el).text()) === h2Title)
    .first();
  if (!h2.length) return events;

  const statBlock = h2.nextAll(".match-stat").first();
  if (!statBlock.length) return events;

  statBlock
    .find(".match-stat__row")
    .each((idx, row) => {
      const $row = $(row);
      const teamSide = $row.hasClass("_team1")
        ? "home"
        : $row.hasClass("_team2")
          ? "away"
          : undefined;
      const playerName = normalizeWhitespace(
        $row.find(".match-stat__player").first().text(),
      );
      if (!playerName) return;

      const assistName =
        normalizeWhitespace($row.find(".match-stat__player2").text()) || undefined;
      const { label, minute } = parseRowMinute($, row);

      if (section === "goals") {
        const scoreEl = $row.find(".match-score").first();
        const type = mapGoalType(scoreEl.attr("title"));
        events.push({
          id: `proto-g-${idx}-${minute ?? "x"}-${playerName}`,
          type,
          minute,
          minuteLabel: label,
          playerName,
          assistName,
          score: normalizeWhitespace(scoreEl.text()) || undefined,
          teamSide,
          section,
        });
        return;
      }

      const iconClass = $row.find(".match-icon").attr("class") ?? "";
      events.push({
        id: `proto-c-${idx}-${minute ?? "x"}-${playerName}`,
        type: mapCardType(iconClass),
        minute,
        minuteLabel: label,
        playerName,
        teamSide,
        section,
      });
    });

  return events;
}

/** События только из вкладки «Протокол» (блоки «Голы» и «Наказания»). */
export function parseChampionatMatchProtocolHtml(
  html: string,
): ChampionatMatchEvent[] {
  const $ = cheerio.load(html);
  const goals = parseProtocolSection($, "Голы", "goals");
  const cards = parseProtocolSection($, "Наказания", "punishments");
  return sortProtocolEvents([...goals, ...cards]);
}

export async function fetchChampionatMatchProtocol(
  matchExternalId: string,
  options: { tournamentId: number; sportSlug: string },
): Promise<ChampionatMatchEvent[]> {
  const championatMatchId = extractChampionatMatchId(matchExternalId);
  if (!championatMatchId) return [];

  const url = championatMatchPageUrl(
    championatMatchId,
    options.tournamentId,
    options.sportSlug,
  );
  const html = await fetchChampionatHtml(url);
  return parseChampionatMatchProtocolHtml(html);
}
