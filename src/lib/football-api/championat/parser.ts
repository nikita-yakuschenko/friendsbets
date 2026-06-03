import * as cheerio from "cheerio";
import { MatchStatus } from "@/generated/prisma/client";
import type { ExternalMatch, ExternalTeamRef } from "@/lib/football-api/types";
import { formatBracketSlotLabel } from "@/lib/football-api/championat/bracket-slot-labels";
import {
  championatMatchExternalId,
  championatSlotExternalId,
  championatTeamExternalId,
  parseChampionatTeamId,
} from "@/lib/football-api/championat/constants";
import { resolveTeamCountryCode } from "@/lib/football-api/championat/team-country-codes";

import { fetchChampionatHtml } from "@/lib/football-api/championat/fetch-html";

type ParsedSide = {
  teamId?: string;
  name: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function toShortName(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}]/gu, "");
  if (cleaned.length <= 3) return cleaned.toUpperCase();
  return cleaned.slice(0, 3).toUpperCase();
}

function parseCountryCodeFromLogo(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const match = src.match(/\/flags\/circle\/([a-z]{2})\.svg/i);
  return match?.[1]?.toUpperCase();
}

function parseScoreText(text: string): {
  homeScore?: number;
  awayScore?: number;
} {
  const normalized = normalizeWhitespace(text).replace(/[–−—]/g, "-");
  const match = normalized.match(/^(\d+|-)\s*:\s*(\d+|-)$/);
  if (!match) return {};

  const home = match[1] === "-" ? undefined : Number(match[1]);
  const away = match[2] === "-" ? undefined : Number(match[2]);

  if (home === undefined || away === undefined) return {};
  if (Number.isNaN(home) || Number.isNaN(away)) return {};

  return { homeScore: home, awayScore: away };
}

function parseDateTime(raw: string): Date {
  const normalized = normalizeWhitespace(raw);
  const match = normalized.match(
    /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/,
  );
  if (!match) {
    throw new Error(`Unsupported Championat datetime: ${raw}`);
  }

  const [, day, month, year, hour, minute] = match;
  // Championat calendar uses Moscow time (UTC+3).
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 3,
      Number(minute),
    ),
  );
}

function buildTeamRef(
  side: ParsedSide,
  countryCodeFromLogo?: string,
): ExternalTeamRef {
  const countryCode =
    countryCodeFromLogo ?? resolveTeamCountryCode(side.name);

  const teamId = parseChampionatTeamId(side.teamId);
  if (teamId) {
    return {
      externalId: championatTeamExternalId(teamId),
      name: side.name,
      shortName: toShortName(side.name),
      countryCode,
      isPlaceholder: false,
    };
  }

  const slot = side.name.trim();
  const displayName = formatBracketSlotLabel(slot);
  return {
    externalId: championatSlotExternalId(slot),
    name: displayName,
    shortName: toShortName(slot),
    isPlaceholder: true,
  };
}

function parseTeamSide(
  $: cheerio.CheerioAPI,
  element: Parameters<typeof $>[0],
): ParsedSide {
  const el = $(element);
  const link = el.is("a.table-item") ? el : el.find("a.table-item").first();

  if (link.length > 0) {
    const href = link.attr("href") ?? "";
    const teamId = parseChampionatTeamId(href.match(/\/teams\/(\d+)\//)?.[1]);
    const name = normalizeWhitespace(link.find(".table-item__name").text());
    return { teamId, name };
  }

  const name = normalizeWhitespace(el.text());
  return { name };
}

function parseTeamsFromRow(
  $: cheerio.CheerioAPI,
  row: ReturnType<typeof $>,
  dataTeam: string | undefined,
): { home: ParsedSide; away: ParsedSide; countryCodes: string[] } {
  const countryCodes: string[] = [];
  const teamLinks = row.find(".stat-results__title-teams .table-item");

  if (teamLinks.length >= 2) {
    const sides: ParsedSide[] = [];
    teamLinks.each((_, element) => {
      const logoSrc = $(element).find("img").attr("src") ?? $(element).find("img").attr("data-src");
      const countryCode = parseCountryCodeFromLogo(logoSrc);
      if (countryCode) countryCodes.push(countryCode);
      sides.push(parseTeamSide($, element));
    });

    return {
      home: sides[0] ?? { name: "?" },
      away: sides[1] ?? { name: "?" },
      countryCodes,
    };
  }

  if (dataTeam?.includes("/")) {
    const [homeIdRaw, awayIdRaw] = dataTeam.split("/");
    const homeId = parseChampionatTeamId(homeIdRaw);
    const awayId = parseChampionatTeamId(awayIdRaw);
    const titleText = normalizeWhitespace(
      row.find(".stat-results__title-teams").text(),
    );
    const parts = titleText.split(/\s*[–−—-]\s*/);
    return {
      home: { teamId: homeId, name: parts[0] ?? "?" },
      away: { teamId: awayId, name: parts[1] ?? "?" },
      countryCodes,
    };
  }

  const titleText = normalizeWhitespace(
    row.find(".stat-results__title-teams").text(),
  );
  const parts = titleText.split(/\s*[–−—-]\s*/);
  return {
    home: { name: parts[0] ?? "?" },
    away: { name: parts[1] ?? "?" },
    countryCodes,
  };
}

function resolveMatchStatus(
  played: boolean,
  startsAt: Date,
  homeScore?: number,
  awayScore?: number,
): MatchStatus {
  if (played) return MatchStatus.FINISHED;
  if (
    homeScore !== undefined &&
    awayScore !== undefined &&
    startsAt.getTime() <= Date.now()
  ) {
    return MatchStatus.LIVE;
  }
  return MatchStatus.SCHEDULED;
}

function buildStage(
  groupText: string,
  tourText: string | undefined,
  labelText: string | undefined,
): string {
  const stage = normalizeWhitespace(groupText);
  const tour = tourText ? normalizeWhitespace(tourText) : "";
  const label = labelText ? normalizeWhitespace(labelText) : "";

  if (/^группа\s+[a-zа-я]/i.test(stage) && tour) {
    return `${stage} · Тур ${tour}`;
  }

  if (stage) return stage;
  if (label) return label;
  return "Матч";
}

export function parseChampionatCalendarHtml(html: string): ExternalMatch[] {
  const $ = cheerio.load(html);
  const matches: ExternalMatch[] = [];

  $("tr.stat-results__row").each((_, element) => {
    const row = $(element);
    const href = row.find("td.stat-results__link a").attr("href") ?? "";
    const matchId = href.match(/\/match\/(\d+)\//)?.[1];
    if (!matchId) return;

    const dateTimeRaw = normalizeWhitespace(
      row.find("td.stat-results__date-time").text(),
    );
    if (!dateTimeRaw) return;

    const { home, away, countryCodes } = parseTeamsFromRow(
      $,
      row,
      row.attr("data-team"),
    );

    const labelText = normalizeWhitespace(
      row.find("td._hidden-td").first().text(),
    );
    const groupText = normalizeWhitespace(
      row.find("td.stat-results__group").text(),
    );
    const tourText = normalizeWhitespace(
      row.find("td.stat-results__tour-num").text(),
    );
    const scoreText = normalizeWhitespace(
      row.find(".stat-results__count-main").text(),
    );

    const startsAt = parseDateTime(dateTimeRaw);
    const { homeScore, awayScore } = parseScoreText(scoreText);
    const played = row.attr("data-played") === "1";

    matches.push({
      externalId: championatMatchExternalId(matchId),
      homeTeam: buildTeamRef(home, countryCodes[0]),
      awayTeam: buildTeamRef(away, countryCodes[1]),
      startsAt,
      stage: buildStage(groupText, tourText, labelText),
      label: labelText || undefined,
      homeScore,
      awayScore,
      status: resolveMatchStatus(played, startsAt, homeScore, awayScore),
    });
  });

  return matches;
}

export async function fetchChampionatCalendar(
  url: string,
): Promise<ExternalMatch[]> {
  const html = await fetchChampionatHtml(url, { timeoutMs: 20_000 });
  return parseChampionatCalendarHtml(html);
}
