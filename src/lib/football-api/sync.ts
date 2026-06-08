import { MatchStatus } from "@/generated/prisma/client";
import { mapWithConcurrency, readConcurrencyFromEnv } from "@/lib/concurrency";
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
  ChampionatSyncMode,
  ChampionatSyncOptions,
  ExternalMatch,
  ExternalTeamRef,
  SyncMatchesResult,
} from "@/lib/football-api/types";
import { championatFinishedTrackingPatch } from "@/lib/football-api/championat/championat-tracking";
import { resolveChampionatSourceForTournament } from "@/lib/football-api/championat/resolve-source";
import { MATCH_LIVE_TRACKING_MAX_MS } from "@/lib/match-prediction-state";
import { logOperation } from "@/lib/logger";
import { handleMatchFinished } from "@/lib/match-result-notifications";
import { recalculateMatchScoresForTournament } from "@/lib/template-match-admin";
import { deriveWinnerTeamId } from "@/lib/utils";
import { CHAMPIONAT_WORLD_CUP_2026 } from "@/lib/football-api/championat/constants";

const VENUE_FETCH_DELAY_MS = 200;
/** Окно «ближайших» матчей для quick sync (часы). */
const QUICK_SYNC_NEAR_HOURS = 72;

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

  const becameFinished =
    data.status === MatchStatus.FINISHED &&
    existing.status !== MatchStatus.FINISHED;

  await prisma.match.update({
    where: { id: existing.id },
    data,
  });

  if (becameFinished) {
    try {
      await handleMatchFinished(tournamentId, existing.id);
    } catch (err) {
      console.warn(
        `[championat-sync] match finished handling failed match=${existing.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  } else if (data.status === MatchStatus.FINISHED) {
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

type EnrichPageOptions = {
  mode: ChampionatSyncMode;
};

async function enrichMatchesFromChampionatPages(
  tournamentId: string,
  source?: ParsedChampionatTournamentUrl,
  options: EnrichPageOptions = { mode: "full" },
): Promise<{
  venuesUpdated: number;
  statusesUpdated: number;
  externalRequests: number;
  errors: number;
}> {
  const config = source ?? getChampionatSyncConfig();
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - MATCH_LIVE_TRACKING_MAX_MS);
  const nearAhead = new Date(
    now.getTime() + QUICK_SYNC_NEAR_HOURS * 60 * 60 * 1000,
  );
  const nearBehind = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const quickOr = [
    { status: MatchStatus.LIVE },
    {
      status: MatchStatus.SCHEDULED,
      startsAt: { gte: nearBehind, lte: nearAhead },
    },
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
  ];

  const fullOr = [
    { venueName: null },
    { venueCity: null },
    ...quickOr,
  ];

  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      externalId: { startsWith: "championat:" },
      championatTrackActive: true,
      OR: options.mode === "quick" ? quickOr : fullOr,
    },
    select: {
      id: true,
      externalId: true,
      status: true,
      championatFinishedAt: true,
    },
  });

  const concurrency = readConcurrencyFromEnv("CHAMPIONAT_SYNC_CONCURRENCY", 2);
  const allowVenueEnrichment = options.mode === "full";

  const stats = await mapWithConcurrency(matches, concurrency, async (match) => {
    const championatMatchId = extractChampionatMatchId(match.externalId);
    if (!championatMatchId) {
      return { venues: 0, statuses: 0, requests: 0, errors: 0 };
    }

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

      if (
        allowVenueEnrichment &&
        (details.venueName || details.venueCity)
      ) {
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
        return { venues: 0, statuses: 0, requests: 1, errors: 0 };
      }

      await prisma.match.update({
        where: { id: match.id },
        data,
      });

      await sleep(VENUE_FETCH_DELAY_MS);
      return {
        venues:
          data.venueName !== undefined || data.venueCity !== undefined ? 1 : 0,
        statuses: data.status !== undefined ? 1 : 0,
        requests: 1,
        errors: 0,
      };
    } catch {
      await sleep(VENUE_FETCH_DELAY_MS);
      return { venues: 0, statuses: 0, requests: 1, errors: 1 };
    }
  });

  const venuesUpdated = stats.reduce((n, s) => n + s.venues, 0);
  const statusesUpdated = stats.reduce((n, s) => n + s.statuses, 0);
  const externalRequests = stats.reduce((n, s) => n + s.requests, 0);
  const errors = stats.reduce((n, s) => n + s.errors, 0);

  if (errors > 0) {
    logOperation("championat-sync:match-page", {
      tournamentId,
      mode: options.mode,
      candidates: matches.length,
      errors,
      level: "error",
      hint: "championat.ru timeout or rate limit — set CHAMPIONAT_SYNC_CONCURRENCY=1",
    });
  }

  return { venuesUpdated, statusesUpdated, externalRequests, errors };
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

export async function syncChampionatTournamentQuick(
  dbTournamentId: string,
  source: ParsedChampionatTournamentUrl,
): Promise<SyncMatchesResult> {
  const started = Date.now();
  const enriched = await enrichMatchesFromChampionatPages(
    dbTournamentId,
    source,
    { mode: "quick" },
  );

  const result: SyncMatchesResult = {
    created: 0,
    updated: 0,
    teamsCreated: 0,
    teamsUpdated: 0,
    venuesUpdated: enriched.venuesUpdated,
    statusesUpdated: enriched.statusesUpdated,
    total: 0,
    mode: "quick",
    externalRequests: enriched.externalRequests,
  };

  logOperation("championat-sync", {
    mode: "quick",
    tournamentId: dbTournamentId,
    durationMs: Date.now() - started,
    total: result.total,
    venuesUpdated: result.venuesUpdated,
    statusesUpdated: result.statusesUpdated ?? 0,
    externalRequests: enriched.externalRequests,
    errors: enriched.errors,
  });

  return result;
}

export async function syncChampionatTournamentFull(
  dbTournamentId: string,
  source: ParsedChampionatTournamentUrl,
  options: { enrichVenues?: boolean } = {},
): Promise<SyncMatchesResult> {
  return syncChampionatTournament(dbTournamentId, source, {
    mode: "full",
    enrichVenues: options.enrichVenues ?? true,
  });
}

const championatSyncInFlight = new Map<string, Promise<SyncMatchesResult>>();

function championatSyncLockKey(
  dbTournamentId: string,
  options: ChampionatSyncOptions,
): string {
  const mode = options.mode ?? "full";
  const enrichVenues = options.enrichVenues ?? mode === "full";
  return `${dbTournamentId}:${mode}:${enrichVenues}`;
}

async function syncChampionatTournamentUnlocked(
  dbTournamentId: string,
  source: ParsedChampionatTournamentUrl,
  options: ChampionatSyncOptions = {},
): Promise<SyncMatchesResult> {
  const mode = options.mode ?? "full";
  if (mode === "quick") {
    return syncChampionatTournamentQuick(dbTournamentId, source);
  }

  const started = Date.now();
  const enrichVenues = options.enrichVenues ?? true;
  let externalRequests = 0;

  logOperation("championat-sync", {
    mode: "full",
    tournamentId: dbTournamentId,
    enrichVenues,
    phase: "calendar",
  });

  externalRequests += 1;
  const externalMatches = await fetchChampionatCalendar(source.calendarUrl);

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
  let enrichErrors = 0;
  if (enrichVenues) {
    const enriched = await enrichMatchesFromChampionatPages(
      dbTournamentId,
      source,
      { mode: "full" },
    );
    venuesUpdated = enriched.venuesUpdated;
    statusesUpdated = enriched.statusesUpdated;
    externalRequests += enriched.externalRequests;
    enrichErrors = enriched.errors;
    await normalizeStoredVenueCities(dbTournamentId);
  }

  const result: SyncMatchesResult = {
    created,
    updated,
    teamsCreated,
    teamsUpdated,
    venuesUpdated,
    statusesUpdated,
    total: externalMatches.length,
    mode: "full",
    externalRequests,
  };

  logOperation("championat-sync", {
    mode: "full",
    tournamentId: dbTournamentId,
    durationMs: Date.now() - started,
    total: result.total,
    created,
    updated,
    venuesUpdated,
    statusesUpdated: statusesUpdated ?? 0,
    externalRequests,
    errors: enrichErrors,
  });

  return result;
}

export async function syncChampionatTournament(
  dbTournamentId: string,
  source: ParsedChampionatTournamentUrl,
  options: ChampionatSyncOptions = {},
): Promise<SyncMatchesResult> {
  const lockKey = championatSyncLockKey(dbTournamentId, options);
  const inFlight = championatSyncInFlight.get(lockKey);
  if (inFlight) return inFlight;

  const run = syncChampionatTournamentUnlocked(dbTournamentId, source, options).finally(
    () => {
      championatSyncInFlight.delete(lockKey);
    },
  );
  championatSyncInFlight.set(lockKey, run);
  return run;
}

export type SyncAllChampionatResult = {
  tournaments: number;
  synced: number;
  skipped: number;
  totals: SyncMatchesResult;
};

/** Синк календаря всех турниров с externalId championat:tournament:* (не только из .env). */
export async function syncAllChampionatTournaments(
  options: ChampionatSyncOptions = {},
): Promise<SyncAllChampionatResult> {
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
      enrichVenues: options.enrichVenues ?? false,
      mode: options.mode ?? "full",
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
  options: ChampionatSyncOptions = {},
): Promise<SyncMatchesResult> {
  const mode = options.mode ?? "full";

  if (!tournamentId) {
    const all = await syncAllChampionatTournaments({ ...options, mode });
    return { ...all.totals, mode };
  }

  const source = await resolveChampionatSourceForTournament(tournamentId);
  if (source) {
    return syncChampionatTournament(tournamentId, source, {
      enrichVenues: options.enrichVenues ?? mode === "full",
      mode,
    });
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
