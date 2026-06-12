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

function mapTimelineType(classAttr: string): ChampionatMatchEventType {
  if (classAttr.includes("_pen")) return "PENALTY_GOAL";
  if (classAttr.includes("_own")) return "OWN_GOAL";
  if (classAttr.includes("_goal")) return "GOAL";
  if (classAttr.includes("_red")) return "RED_CARD";
  if (classAttr.includes("_yellow")) return "YELLOW_CARD";
  return "UNKNOWN";
}

function eventKey(event: {
  type: ChampionatMatchEventType;
  minute: number | null;
  playerName: string;
}): string {
  return `${event.type}:${event.minute ?? "?"}:${event.playerName.toLowerCase()}`;
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
      const { label, minute } = parseMinute(
        $row.find(".match-stat__main-value").first().text(),
      );

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

function parseTimelineEvents($: CheerioAPI): ChampionatMatchEvent[] {
  const events: ChampionatMatchEvent[] = [];

  $(".match-timeline__event").each((eventIdx, el) => {
    const $el = $(el);
    const classAttr = $el.attr("class") ?? "";
    const fallbackType = mapTimelineType(classAttr);

    const teamBlockClass = $el.parent().parent().attr("class") ?? "";
    const teamSide = teamBlockClass.includes("_team1")
      ? "home"
      : teamBlockClass.includes("_team2")
        ? "away"
        : undefined;

    const rows = $el.find(".match-timeline__bubble-row");
    if (rows.length > 0) {
      rows.each((rowIdx, row) => {
        const $row = $(row);
        const rowClass = $row.attr("class") ?? "";
        const rowType = mapTimelineType(rowClass);
        const type = rowType !== "UNKNOWN" ? rowType : fallbackType;
        const section: ChampionatMatchEventSection =
          type === "YELLOW_CARD" || type === "RED_CARD"
            ? "punishments"
            : "goals";

        const minuteText = normalizeWhitespace(
          $row.find(".match-timeline__bubble-minute").first().text(),
        );
        const { label, minute } = parseMinute(minuteText);

        const $title = $row.find(".match-timeline__bubble-title").first();
        const score =
          normalizeWhitespace(
            $title.find(".match-timeline__bubble-score").first().text(),
          ).replace(/\s/g, "") || undefined;

        let playerName = normalizeWhitespace($title.text());
        if (score) {
          playerName = normalizeWhitespace(playerName.replace(score, ""));
        }
        if (!playerName) return;

        events.push({
          id: `tl-${eventIdx}-${rowIdx}-${minute ?? "x"}-${playerName}`,
          type,
          minute,
          minuteLabel: label,
          playerName,
          score,
          teamSide,
          section,
        });
      });
      return;
    }

    const minuteText = normalizeWhitespace(
      $el.find(".match-timeline__bubble-minute").first().text(),
    );
    const { label, minute } = parseMinute(minuteText);
    const playerName = normalizeWhitespace(
      $el.find(".match-timeline__bubble-title").first().text(),
    );
    if (!playerName) return;

    const section: ChampionatMatchEventSection =
      fallbackType === "YELLOW_CARD" || fallbackType === "RED_CARD"
        ? "punishments"
        : "goals";

    events.push({
      id: `tl-${eventIdx}-0-${minute ?? "x"}-${playerName}`,
      type: fallbackType,
      minute,
      minuteLabel: label,
      playerName,
      teamSide,
      section,
    });
  });

  return events;
}

function mergeEvents(
  protocol: ChampionatMatchEvent[],
  timeline: ChampionatMatchEvent[],
): ChampionatMatchEvent[] {
  const seen = new Set(protocol.map(eventKey));
  const merged = [...protocol];
  for (const event of timeline) {
    const key = eventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }
  merged.sort((a, b) => {
    const ma = a.minute ?? 9999;
    const mb = b.minute ?? 9999;
    if (ma !== mb) return ma - mb;
    return a.playerName.localeCompare(b.playerName, "ru");
  });
  return merged;
}

export function parseChampionatMatchProtocolHtml(
  html: string,
): ChampionatMatchEvent[] {
  const $ = cheerio.load(html);
  const goals = parseProtocolSection($, "Голы", "goals");
  const cards = parseProtocolSection($, "Наказания", "punishments");
  const protocol = [...goals, ...cards];
  const timeline = parseTimelineEvents($);
  return mergeEvents(protocol, timeline);
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
