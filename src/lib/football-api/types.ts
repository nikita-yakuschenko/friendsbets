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

export type SyncMatchesResult = {
  created: number;
  updated: number;
  teamsCreated: number;
  teamsUpdated: number;
  venuesUpdated: number;
  total: number;
};

export type ChampionatSyncOptions = {
  /** По одному HTTP-запросу на матч — долго. На создании турнира лучше false. */
  enrichVenues?: boolean;
};
