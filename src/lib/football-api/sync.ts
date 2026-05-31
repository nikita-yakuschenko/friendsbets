import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  fetchTournamentMatches,
  getChampionatSyncConfig,
} from "@/lib/football-api/client";
import {
  extractChampionatMatchId,
  fetchChampionatMatchDetails,
} from "@/lib/football-api/championat/match-details";
import { resolveTeamCountryCode } from "@/lib/football-api/championat/team-country-codes";
import { normalizeVenueCity } from "@/lib/venue";
import type {
  ExternalMatch,
  ExternalTeamRef,
  SyncMatchesResult,
} from "@/lib/football-api/types";
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

  const data = {
    stage: match.stage,
    homeTeamId,
    awayTeamId,
    startsAt: match.startsAt,
    status: match.status,
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    winnerTeamId,
  };

  const existing = await prisma.match.findFirst({
    where: { tournamentId, externalId: match.externalId },
  });

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
    existing.winnerTeamId === data.winnerTeamId;

  if (unchanged) return "unchanged";

  await prisma.match.update({
    where: { id: existing.id },
    data,
  });

  return "updated";
}

async function enrichMatchVenues(tournamentId: string): Promise<number> {
  const config = getChampionatSyncConfig();
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      externalId: { startsWith: "championat:" },
      OR: [{ venueName: null }, { venueCity: null }],
    },
    select: { id: true, externalId: true },
  });

  let venuesUpdated = 0;

  for (const match of matches) {
    const championatMatchId = extractChampionatMatchId(match.externalId);
    if (!championatMatchId) continue;

    try {
      const details = await fetchChampionatMatchDetails(championatMatchId, {
        tournamentId: config.championatTournamentId,
        sportSlug: config.sportSlug,
      });

      if (!details.venueName && !details.venueCity) {
        await sleep(VENUE_FETCH_DELAY_MS);
        continue;
      }

      await prisma.match.update({
        where: { id: match.id },
        data: {
          venueName: details.venueName ?? null,
          venueCity: normalizeVenueCity(details.venueCity) ?? null,
        },
      });
      venuesUpdated += 1;
    } catch {
      // Пропускаем матч при временной ошибке Championat.
    }

    await sleep(VENUE_FETCH_DELAY_MS);
  }

  return venuesUpdated;
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

export async function syncMatches(
  tournamentId?: string,
): Promise<SyncMatchesResult> {
  const dbTournamentId = tournamentId ?? (await resolveDbTournamentId());

  await prisma.tournament.update({
    where: { id: dbTournamentId },
    data: {
      title: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
      description: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
    },
  });

  const externalMatches = await fetchTournamentMatches();

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

  const venuesUpdated = await enrichMatchVenues(dbTournamentId);
  await normalizeStoredVenueCities(dbTournamentId);

  return {
    created,
    updated,
    teamsCreated,
    teamsUpdated,
    venuesUpdated,
    total: externalMatches.length,
  };
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
