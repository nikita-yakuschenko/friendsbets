import type { MatchStatus } from "@/generated/prisma/client";

export type ExternalTeamRef = {
  externalId: string;
  name: string;
  shortName: string;
  countryCode?: string;
  isPlaceholder: boolean;
};

export type ExternalMatch = {
  externalId: string;
  homeTeam: ExternalTeamRef;
  awayTeam: ExternalTeamRef;
  startsAt: Date;
  stage: string;
  label?: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
};

export type ChampionatSyncMode = "quick" | "full";

export type SyncMatchesResult = {
  created: number;
  updated: number;
  teamsCreated: number;
  teamsUpdated: number;
  venuesUpdated: number;
  statusesUpdated?: number;
  total: number;
  mode?: ChampionatSyncMode;
  externalRequests?: number;
};

export type ChampionatSyncOptions = {
  /** По одному HTTP-запросу на матч — долго. На создании турнира лучше false. */
  enrichVenues?: boolean;
  /** quick — только ближайшие/LIVE матчи; full — календарь + enrichment. */
  mode?: ChampionatSyncMode;
};
