import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ParsedChampionatTournamentUrl } from "@/lib/championat-url";
import {
  fetchTournamentMatches,
  getChampionatSyncConfig,
} from "@/lib/football-api/client";
import { fetchChampionatCalendar } from "@/lib/football-api/championat/parser";
import {
  extractChampionatMatchId,
  fetchChampionatMatchDetails,
} from "@/lib/football-api/championat/match-details";
import { resolveTeamCountryCode } from "@/lib/football-api/championat/team-country-codes";
import { normalizeVenueCity } from "@/lib/venue";
import type {
  ChampionatSyncOptions,
  ExternalMatch,
  ExternalTeamRef,
  SyncMatchesResult,
} from "@/lib/football-api/types";
import { championatFinishedTrackingPatch } from "@/lib/football-api/championat/championat-tracking";
import { resolveChampionatSourceForTournament } from "@/lib/football-api/championat/resolve-source";
import { MATCH_LIVE_TRACKING_MAX_MS } from "@/lib/match-prediction-state";
import { recalculateMatchScoresForTournament } from "@/lib/template-match-admin";
import { deriveWinnerTeamId } from "@/lib/utils";
import { CHAMPIONAT_WORLD_CUP_2026 } from "@/lib/football-api/championat/constants";

const VENUE_FETCH_DELAY_MS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveCountryCode(ref: ExternalTeamRef): string | undefined {
  if (ref.isPlaceholder) return undefined;
  return ref.countryCode ?? resolveTeamCountryCode(ref.name);
}

async function resolveDbTournamentId(): Promise<string> {
  const config = getChampionatSyncConfig();

  if (config.dbTournamentId) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: config.dbTournamentId },
    });
    if (!tournament) {
      throw new Error(
        `Tournament not found: CHAMPIONAT_SYNC_TOURNAMENT_ID=${config.dbTournamentId}`,
      );
    }
    return tournament.id;
  }

  const byExternalId = await prisma.tournament.findUnique({
    where: { externalId: config.tournamentExternalId },
  });
  if (byExternalId) return byExternalId.id;

  const active = await prisma.tournament.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!active) {
    throw new Error(
      "No tournament to sync into. Set CHAMPIONAT_SYNC_TOURNAMENT_ID or create an ACTIVE tournament.",
    );
  }

  await prisma.tournament.update({
    where: { id: active.id },
    data: { externalId: config.tournamentExternalId },
  });

  return active.id;
}

async function upsertExternalTeam(
  ref: ExternalTeamRef,
): Promise<{ id: string; created: boolean; updated: boolean }> {
  const countryCode = resolveCountryCode(ref);
  const existing = await prisma.team.findUnique({
    where: { externalId: ref.externalId },
  });

  if (existing) {
    if (countryCode && existing.countryCode == null) {
      await prisma.team.update({
        where: { id: existing.id },
        data: { countryCode },
      });
      return { id: existing.id, created: false, updated: true };
    }

    return { id: existing.id, created: false, updated: false };
  }

  const created = await prisma.team.create({
    data: {
      externalId: ref.externalId,
      name: ref.name,
      shortName: ref.shortName,
      countryCode,
    },
  });

  return { id: created.id, created: true, updated: false };
}

async function upsertExternalMatch(
  tournamentId: string,
  match: ExternalMatch,
  homeTeamId: string,
  awayTeamId: string,
): Promise<"created" | "updated" | "unchanged"> {
  const winnerTeamId =
    match.status === MatchStatus.FINISHED &&
    match.homeScore !== undefined &&
    match.awayScore !== undefined
      ? deriveWinnerTeamId(
          match.homeScore,
          match.awayScore,
          homeTeamId,
          awayTeamId,
        )
      : null;

  const existing = await prisma.match.findFirst({
    where: { tournamentId, externalId: match.externalId },
  });

  const now = new Date();
  const tracking =
    match.status === MatchStatus.CANCELLED
      ? { championatTrackActive: false, championatFinishedAt: null as Date | null }
      : championatFinishedTrackingPatch(
          existing?.status ?? MatchStatus.SCHEDULED,
          match.status,
          existing?.championatFinishedAt,
          now,
        );

  const data = {
    stage: match.stage,
    homeTeamId,
    awayTeamId,
    startsAt: match.startsAt,
    status: match.status,
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    winnerTeamId,
    championatTrackActive: tracking.championatTrackActive ?? true,
    championatFinishedAt:
      match.status === MatchStatus.FINISHED
        ? (tracking.championatFinishedAt ?? now)
        : null,
  };

  if (!existing) {
    await prisma.match.create({
      data: {
        tournamentId,
        externalId: match.externalId,
        ...data,
      },
    });
    return "created";
  }

  const unchanged =
    existing.stage === data.stage &&
    existing.homeTeamId === data.homeTeamId &&
    existing.awayTeamId === data.awayTeamId &&
    existing.startsAt.getTime() === data.startsAt.getTime() &&
    existing.status === data.status &&
    existing.homeScore === data.homeScore &&
    existing.awayScore === data.awayScore &&
    existing.winnerTeamId === data.winnerTeamId &&
    existing.championatTrackActive === data.championatTrackActive &&
    existing.championatFinishedAt?.getTime() ===
      data.championatFinishedAt?.getTime();

  if (unchanged) return "unchanged";

  await prisma.match.update({
    where: { id: existing.id },
    data,
  });

  if (data.status === MatchStatus.FINISHED) {
    try {
      await recalculateMatchScoresForTournament(tournamentId, existing.id);
    } catch (err) {
      console.warn(
        `[championat-sync] recalc scores failed match=${existing.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return "updated";
}

export async function refreshChampionatMatchPages(
  tournamentId: string,
  source: ParsedChampionatTournamentUrl,
): Promise<{ venuesUpdated: number; statusesUpdated: number }> {
  return enrichMatchesFromChampionatPages(tournamentId, source);
}

async function enrichMatchesFromChampionatPages(
  tournamentId: string,
  source?: ParsedChampionatTournamentUrl,
): Promise<{ venuesUpdated: number; statusesUpdated: number }> {
  const config = source ?? getChampionatSyncConfig();
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - MATCH_LIVE_TRACKING_MAX_MS);

  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      externalId: { startsWith: "championat:" },
      OR: [
        { venueName: null },
        { venueCity: null },
        { status: MatchStatus.LIVE },
        {
          status: MatchStatus.SCHEDULED,
          startsAt: { lte: now },
          homeScore: null,
          awayScore: null,
        },
        {
          status: { notIn: [MatchStatus.FINISHED, MatchStatus.CANCELLED] },
          startsAt: { lte: staleCutoff },
        },
      ],
    },
    select: {
      id: true,
      externalId: true,
      status: true,
      championatFinishedAt: true,
    },
  });

  let venuesUpdated = 0;
  let statusesUpdated = 0;

  for (const match of matches) {
    const championatMatchId = extractChampionatMatchId(match.externalId);
    if (!championatMatchId) continue;

    try {
      const details = await fetchChampionatMatchDetails(championatMatchId, {
        tournamentId: config.championatTournamentId,
        sportSlug: config.sportSlug,
      });

      const data: {
        venueName?: string | null;
        venueCity?: string | null;
        status?: MatchStatus;
        homeScore?: number;
        awayScore?: number;
        championatTrackActive?: boolean;
        championatFinishedAt?: Date;
      } = {};

      if (details.venueName || details.venueCity) {
        data.venueName = details.venueName ?? null;
        data.venueCity = normalizeVenueCity(details.venueCity) ?? null;
      }

      if (details.status && details.status !== match.status) {
        data.status = details.status;
      }

      if (
        details.homeScore !== undefined &&
        details.awayScore !== undefined
      ) {
        data.homeScore = details.homeScore;
        data.awayScore = details.awayScore;
        if (!data.status && match.status === MatchStatus.SCHEDULED) {
          data.status = MatchStatus.LIVE;
        }
      }

      const nextStatus = data.status ?? match.status;
      Object.assign(
        data,
        championatFinishedTrackingPatch(
          match.status,
          nextStatus,
          match.championatFinishedAt,
          new Date(),
        ),
      );

      if (Object.keys(data).length === 0) {
        await sleep(VENUE_FETCH_DELAY_MS);
        continue;
      }

      await prisma.match.update({
        where: { id: match.id },
        data,
      });

      if (data.venueName !== undefined || data.venueCity !== undefined) {
        venuesUpdated += 1;
      }
      if (data.status !== undefined) {
        statusesUpdated += 1;
      }
    } catch (error) {
      console.warn(
        `[championat-sync] match page failed id=${championatMatchId}`,
        error instanceof Error ? error.message : error,
      );
    }

    await sleep(VENUE_FETCH_DELAY_MS);
  }

  return { venuesUpdated, statusesUpdated };
}

async function normalizeStoredVenueCities(tournamentId: string): Promise<void> {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      venueCity: { not: null },
    },
    select: { id: true, venueCity: true },
  });

  for (const match of matches) {
    const normalized = normalizeVenueCity(match.venueCity);
    if (normalized && normalized !== match.venueCity) {
      await prisma.match.update({
        where: { id: match.id },
        data: { venueCity: normalized },
      });
    }
  }
}

export async function enrichChampionatVenuesOnly(
  dbTournamentId: string,
  source: ParsedChampionatTournamentUrl,
): Promise<number> {
  const { venuesUpdated } = await enrichMatchesFromChampionatPages(
    dbTournamentId,
    source,
  );
  await normalizeStoredVenueCities(dbTournamentId);
  return venuesUpdated;
}

export async function syncChampionatTournament(
  dbTournamentId: string,
  source: ParsedChampionatTournamentUrl,
  options: ChampionatSyncOptions = {},
): Promise<SyncMatchesResult> {
  const enrichVenues = options.enrichVenues ?? true;

  console.info(
    `[championat-sync] calendar fetch tournament=${dbTournamentId} enrichVenues=${enrichVenues}`,
  );
  const externalMatches = await fetchChampionatCalendar(source.calendarUrl);
  console.info(`[championat-sync] calendar parsed matches=${externalMatches.length}`);

  let created = 0;
  let updated = 0;
  let teamsCreated = 0;
  let teamsUpdated = 0;

  for (const match of externalMatches) {
    const home = await upsertExternalTeam(match.homeTeam);
    const away = await upsertExternalTeam(match.awayTeam);

    if (home.created) teamsCreated += 1;
    if (away.created) teamsCreated += 1;
    if (home.updated) teamsUpdated += 1;
    if (away.updated) teamsUpdated += 1;

    const result = await upsertExternalMatch(
      dbTournamentId,
      match,
      home.id,
      away.id,
    );

    if (result === "created") created += 1;
    if (result === "updated") updated += 1;
  }

  let venuesUpdated = 0;
  let statusesUpdated = 0;
  if (enrichVenues) {
    console.info("[championat-sync] enriching match pages…");
    const enriched = await enrichMatchesFromChampionatPages(
      dbTournamentId,
      source,
    );
    venuesUpdated = enriched.venuesUpdated;
    statusesUpdated = enriched.statusesUpdated;
    await normalizeStoredVenueCities(dbTournamentId);
    console.info(
      `[championat-sync] venues updated=${venuesUpdated} statuses updated=${statusesUpdated}`,
    );
  }

  return {
    created,
    updated,
    teamsCreated,
    teamsUpdated,
    venuesUpdated,
    total: externalMatches.length,
  };
}

export type SyncAllChampionatResult = {
  tournaments: number;
  synced: number;
  skipped: number;
  totals: SyncMatchesResult;
};

/** Синк календаря всех турниров с externalId championat:tournament:* (не только из .env). */
export async function syncAllChampionatTournaments(): Promise<SyncAllChampionatResult> {
  const tournaments = await prisma.tournament.findMany({
    where: { externalId: { startsWith: "championat:tournament:" } },
    select: { id: true, title: true },
  });

  const totals: SyncMatchesResult = {
    created: 0,
    updated: 0,
    teamsCreated: 0,
    teamsUpdated: 0,
    venuesUpdated: 0,
    total: 0,
  };

  let synced = 0;
  let skipped = 0;

  for (const tournament of tournaments) {
    const source = await resolveChampionatSourceForTournament(tournament.id);
    if (!source) {
      skipped += 1;
      console.warn(
        `[championat-sync] skip tournament=${tournament.id} (${tournament.title}): no Championat URL`,
      );
      continue;
    }

    const result = await syncChampionatTournament(tournament.id, source, {
      enrichVenues: true,
    });
    synced += 1;
    totals.created += result.created;
    totals.updated += result.updated;
    totals.teamsCreated += result.teamsCreated;
    totals.teamsUpdated += result.teamsUpdated;
    totals.venuesUpdated += result.venuesUpdated;
    totals.total += result.total;
  }

  return { tournaments: tournaments.length, synced, skipped, totals };
}

export async function syncMatches(
  tournamentId?: string,
): Promise<SyncMatchesResult> {
  if (!tournamentId) {
    const all = await syncAllChampionatTournaments();
    return all.totals;
  }

  const source = await resolveChampionatSourceForTournament(tournamentId);
  if (source) {
    return syncChampionatTournament(tournamentId, source, { enrichVenues: true });
  }

  const dbTournamentId = await resolveDbTournamentId();
  const config = getChampionatSyncConfig();

  await prisma.tournament.update({
    where: { id: dbTournamentId },
    data: {
      title: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
      description: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
    },
  });

  const fallbackSource: ParsedChampionatTournamentUrl = {
    championatTournamentId: config.championatTournamentId,
    sportSlug: config.sportSlug,
    calendarUrl: config.calendarUrl,
    tournamentExternalId: config.tournamentExternalId,
  };

  return syncChampionatTournament(dbTournamentId, fallbackSource);
}

export async function updateMatchResultFromExternalSource(
  matchExternalId: string,
): Promise<boolean> {
  const externalMatches = await fetchTournamentMatches();
  const externalMatch = externalMatches.find(
    (match) => match.externalId === matchExternalId,
  );

  if (!externalMatch || externalMatch.status !== MatchStatus.FINISHED) {
    return false;
  }

  const dbMatch = await prisma.match.findFirst({
    where: { externalId: matchExternalId },
  });
  if (!dbMatch) return false;

  const home = await upsertExternalTeam(externalMatch.homeTeam);
  const away = await upsertExternalTeam(externalMatch.awayTeam);

  await upsertExternalMatch(
    dbMatch.tournamentId,
    externalMatch,
    home.id,
    away.id,
  );

  return true;
}
