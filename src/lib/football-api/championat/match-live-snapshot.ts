import { MatchStatus } from "@/generated/prisma/client";
import { fetchChampionatHtml } from "@/lib/football-api/championat/fetch-html";
import { championatLivePhaseToMatchStatus } from "@/lib/football-api/championat/championat-phase-to-match-status";
import {
  parseChampionatLiveStatusFromHtml,
  type ChampionatLivePhase,
  type ChampionatLiveStatus,
} from "@/lib/football-api/championat/match-live-status";
import {
  championatMatchPageUrl,
  extractChampionatMatchId,
  parseChampionatMatchPageHtml,
} from "@/lib/football-api/championat/match-details";
import { parseChampionatMatchProtocolHtml } from "@/lib/football-api/championat/match-protocol";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";

export type ChampionatMatchLiveSnapshot = {
  events: ChampionatMatchEvent[];
  homeScore?: number;
  awayScore?: number;
  status?: MatchStatus;
  livePhase: ChampionatLivePhase;
  liveStatus: ChampionatLiveStatus;
};

function isScoringEvent(type: ChampionatMatchEvent["type"]): boolean {
  return type === "GOAL" || type === "PENALTY_GOAL" || type === "OWN_GOAL";
}

/** Счёт после последнего гола в протоколе (если в шапке страницы ещё старый). */
export function deriveScoreFromProtocolEvents(
  events: ChampionatMatchEvent[],
): { homeScore: number; awayScore: number } | null {
  let bestMinute = -1;
  let bestScore: string | null = null;

  for (const event of events) {
    if (!isScoringEvent(event.type) || !event.score) continue;
    const minute = event.minute ?? -1;
    if (minute >= bestMinute) {
      bestMinute = minute;
      bestScore = event.score;
    }
  }

  if (!bestScore) return null;
  const parsed = bestScore.match(/(\d+)\s*:\s*(\d+)/);
  if (!parsed) return null;

  return {
    homeScore: Number(parsed[1]),
    awayScore: Number(parsed[2]),
  };
}

function pickLiveScore(
  header?: { homeScore?: number; awayScore?: number },
  fromGoals?: { homeScore: number; awayScore: number } | null,
): { homeScore: number; awayScore: number } | undefined {
  const candidates: { homeScore: number; awayScore: number }[] = [];
  if (header?.homeScore !== undefined && header.awayScore !== undefined) {
    candidates.push({
      homeScore: header.homeScore,
      awayScore: header.awayScore,
    });
  }
  if (fromGoals) candidates.push(fromGoals);
  if (candidates.length === 0) return undefined;

  return candidates.sort(
    (a, b) =>
      b.homeScore + b.awayScore - (a.homeScore + a.awayScore),
  )[0];
}

export function parseChampionatMatchLiveSnapshot(
  html: string,
): ChampionatMatchLiveSnapshot {
  const events = parseChampionatMatchProtocolHtml(html);
  const details = parseChampionatMatchPageHtml(html);
  const fromGoals = deriveScoreFromProtocolEvents(events);
  const score = pickLiveScore(details, fromGoals);
  const liveStatus = parseChampionatLiveStatusFromHtml(html);
  const status =
    championatLivePhaseToMatchStatus(liveStatus.phase) ?? details.status;

  return {
    events,
    homeScore: score?.homeScore,
    awayScore: score?.awayScore,
    status,
    livePhase: liveStatus.phase,
    liveStatus,
  };
}

export async function fetchChampionatMatchLiveSnapshot(
  matchExternalId: string,
  options: { tournamentId: number; sportSlug: string },
): Promise<ChampionatMatchLiveSnapshot> {
  const championatMatchId = extractChampionatMatchId(matchExternalId);
  if (!championatMatchId) {
    return {
      events: [],
      livePhase: "scheduled",
      liveStatus: { phase: "scheduled", rawText: "" },
    };
  }

  const url = championatMatchPageUrl(
    championatMatchId,
    options.tournamentId,
    options.sportSlug,
  );
  const html = await fetchChampionatHtml(url);
  return parseChampionatMatchLiveSnapshot(html);
}
