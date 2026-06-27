import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import { parseChampionatCalendarHtml } from "@/lib/football-api/championat/parser";
import type { ExternalMatch } from "@/lib/football-api/types";

const TOURNAMENT_ID = "tournament-test-1";
const calendarHtml = readFileSync(
  join(process.cwd(), "tests/fixtures/championat-calendar-snippet.html"),
  "utf8",
);
const baseMatches = parseChampionatCalendarHtml(calendarHtml);

type TeamRow = {
  id: string;
  externalId: string;
  name: string;
  shortName: string | null;
  countryCode: string | null;
};

type MatchRow = {
  id: string;
  tournamentId: string;
  externalId: string;
  stage: string;
  homeTeamId: string;
  awayTeamId: string;
  startsAt: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  championatTrackActive: boolean;
  championatFinishedAt: Date | null;
};

const store = vi.hoisted(() => {
  let teamSeq = 0;
  let matchSeq = 0;
  const teams = new Map<string, TeamRow>();
  const matches = new Map<string, MatchRow>();

  const reset = () => {
    teamSeq = 0;
    matchSeq = 0;
    teams.clear();
    matches.clear();
  };

  const teamByExternal = (externalId: string) =>
    [...teams.values()].find((t) => t.externalId === externalId);

  const matchByExternal = (tournamentId: string, externalId: string) =>
    [...matches.values()].find(
      (m) => m.tournamentId === tournamentId && m.externalId === externalId,
    );

  return {
    reset,
    teams,
    matches,
    prisma: {
      tournament: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(async () => []),
        update: vi.fn(),
      },
      team: {
        findUnique: vi.fn(async ({ where }: { where: { externalId: string } }) =>
          teamByExternal(where.externalId) ?? null,
        ),
        create: vi.fn(
          async ({
            data,
          }: {
            data: {
              externalId: string;
              name: string;
              shortName: string;
              countryCode?: string;
            };
          }) => {
            teamSeq += 1;
            const row: TeamRow = {
              id: `team-${teamSeq}`,
              externalId: data.externalId,
              name: data.name,
              shortName: data.shortName,
              countryCode: data.countryCode ?? null,
            };
            teams.set(row.id, row);
            return row;
          },
        ),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: { countryCode: string };
          }) => {
            const row = teams.get(where.id);
            if (!row) throw new Error("team not found");
            row.countryCode = data.countryCode;
            return row;
          },
        ),
      },
      match: {
        findFirst: vi.fn(
          async ({
            where,
          }: {
            where: { tournamentId: string; externalId: string };
          }) => matchByExternal(where.tournamentId, where.externalId) ?? null,
        ),
        findMany: vi.fn(async () => []),
        create: vi.fn(
          async ({
            data,
          }: {
            data: Omit<MatchRow, "id"> & { externalId: string };
          }) => {
            matchSeq += 1;
            const row: MatchRow = {
              id: `match-${matchSeq}`,
              ...data,
            };
            matches.set(row.id, row);
            return row;
          },
        ),
        update: vi.fn(
          async ({ where, data }: { where: { id: string }; data: Partial<MatchRow> }) => {
            const row = matches.get(where.id);
            if (!row) throw new Error("match not found");
            Object.assign(row, data);
            return row;
          },
        ),
      },
    },
  };
});

const calendarMatchesRef = vi.hoisted(() => ({
  current: [] as ExternalMatch[],
}));

vi.mock("@/lib/db", () => ({ prisma: store.prisma }));

vi.mock("@/lib/football-api/championat/parser", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/football-api/championat/parser")>();
  return {
    ...actual,
    fetchChampionatCalendar: vi.fn(async () => calendarMatchesRef.current),
  };
});

vi.mock("@/lib/football-api/championat/match-details", () => ({
  extractChampionatMatchId: vi.fn((externalId: string | null) => {
    const m = externalId?.match(/championat:match:(\d+)/);
    return m ? m[1] : null;
  }),
  fetchChampionatMatchDetails: vi.fn(),
}));

vi.mock("@/lib/template-match-admin", () => ({
  recalculateMatchScoresForTournament: vi.fn(),
}));

vi.mock("@/lib/match-result-notifications", () => ({
  handleMatchFinished: vi.fn(),
}));

vi.mock("@/lib/football-api/championat/resolve-source", () => ({
  resolveChampionatSourceForTournament: vi.fn(),
}));

const source = {
  championatTournamentId: 6880,
  sportSlug: "football",
  calendarUrl: "https://example.com/calendar",
  tournamentExternalId: "championat:tournament:6880",
};

describe("syncChampionatTournament", () => {
  beforeEach(() => {
    store.reset();
    calendarMatchesRef.current = baseMatches.map((m) => ({
      ...m,
      startsAt: new Date(m.startsAt),
      homeTeam: { ...m.homeTeam },
      awayTeam: { ...m.awayTeam },
    }));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("создаёт команды и матчи при первом синке", async () => {
    const { syncChampionatTournament } = await import("@/lib/football-api/sync");

    const result = await syncChampionatTournament(TOURNAMENT_ID, source, {
      enrichVenues: false,
    });

    expect(result.created).toBeGreaterThan(0);
    expect(result.total).toBe(calendarMatchesRef.current.length);
    expect(store.teams.size).toBeGreaterThan(0);
    expect(store.matches.size).toBe(calendarMatchesRef.current.length);
  });

  it("повторный синк не создаёт дубликаты", async () => {
    const { syncChampionatTournament } = await import("@/lib/football-api/sync");

    const first = await syncChampionatTournament(TOURNAMENT_ID, source, {
      enrichVenues: false,
    });
    const second = await syncChampionatTournament(TOURNAMENT_ID, source, {
      enrichVenues: false,
    });

    expect(first.created).toBeGreaterThan(0);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(store.matches.size).toBe(first.total);
  });

  it("обновляет счёт и статус при изменении данных календаря", async () => {
    const { syncChampionatTournament } = await import("@/lib/football-api/sync");

    await syncChampionatTournament(TOURNAMENT_ID, source, { enrichVenues: false });

    const upcoming = calendarMatchesRef.current.find((m) =>
      m.externalId.endsWith("1310928"),
    );
    expect(upcoming).toBeDefined();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(upcoming!.startsAt.getTime() + 3 * 60 * 60 * 1000));
    calendarMatchesRef.current = calendarMatchesRef.current.map((m) =>
      m.externalId === upcoming!.externalId
        ? {
            ...m,
            homeScore: 2,
            awayScore: 1,
            status: MatchStatus.FINISHED,
          }
        : m,
    );

    const second = await syncChampionatTournament(TOURNAMENT_ID, source, {
      enrichVenues: false,
    });

    expect(second.updated).toBeGreaterThanOrEqual(1);
    const row = [...store.matches.values()].find(
      (m) => m.externalId === upcoming!.externalId,
    );
    expect(row?.homeScore).toBe(2);
    expect(row?.awayScore).toBe(1);
    expect(row?.status).toBe(MatchStatus.FINISHED);
  });

  it("дополняет countryCode у существующей команды без кода", async () => {
    const { syncChampionatTournament } = await import("@/lib/football-api/sync");
    const ref = baseMatches[0]!.homeTeam;
    store.teams.set("team-existing", {
      id: "team-existing",
      externalId: ref.externalId,
      name: ref.name,
      shortName: ref.shortName,
      countryCode: null,
    });

    const result = await syncChampionatTournament(TOURNAMENT_ID, source, {
      enrichVenues: false,
    });

    expect(result.teamsUpdated).toBeGreaterThanOrEqual(1);
    expect(store.prisma.team.update).toHaveBeenCalled();
    expect(store.teams.get("team-existing")?.countryCode).toBeTruthy();
  });

  it("quick sync обновляет участников плей-офф без результата матча", async () => {
    const matchExternalId = "championat:1310268";
    const placeholderHome = "championat:slot:2A";
    const placeholderAway = "championat:slot:2B";
    const realHome = "championat:274832";
    const realAway = "championat:274766";

    store.teams.set("t-home-slot", {
      id: "t-home-slot",
      externalId: placeholderHome,
      name: "2-е место, группа A",
      shortName: "2A",
      countryCode: null,
    });
    store.teams.set("t-away-slot", {
      id: "t-away-slot",
      externalId: placeholderAway,
      name: "2-е место, группа B",
      shortName: "2B",
      countryCode: null,
    });
    store.matches.set("m-playoff", {
      id: "m-playoff",
      tournamentId: TOURNAMENT_ID,
      externalId: matchExternalId,
      stage: "1/16 финала",
      homeTeamId: "t-home-slot",
      awayTeamId: "t-away-slot",
      startsAt: new Date("2026-06-29T19:00:00.000Z"),
      status: MatchStatus.SCHEDULED,
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
      championatTrackActive: true,
      championatFinishedAt: null,
    });

    calendarMatchesRef.current = [
      {
        externalId: matchExternalId,
        homeTeam: {
          externalId: realHome,
          name: "ЮАР",
          shortName: "ЮАР",
          countryCode: "ZA",
          isPlaceholder: false,
        },
        awayTeam: {
          externalId: realAway,
          name: "Канада",
          shortName: "КAN",
          countryCode: "CA",
          isPlaceholder: false,
        },
        startsAt: new Date("2026-06-29T19:00:00.000Z"),
        stage: "1/16 финала",
        status: MatchStatus.SCHEDULED,
      },
    ];

    vi.mocked(store.prisma.match.findMany).mockImplementation(
      async ({ where }: { where?: { tournamentId?: string } }) => {
        if (where?.tournamentId !== TOURNAMENT_ID) return [];
        const row = store.matches.get("m-playoff")!;
        const home = store.teams.get(row.homeTeamId)!;
        const away = store.teams.get(row.awayTeamId)!;
        return [
          {
            externalId: row.externalId,
            homeTeam: { externalId: home.externalId },
            awayTeam: { externalId: away.externalId },
          },
        ] as never;
      },
    );

    const { syncChampionatTournamentQuick } = await import("@/lib/football-api/sync");
    const result = await syncChampionatTournamentQuick(TOURNAMENT_ID, source);

    expect(result.updated).toBeGreaterThanOrEqual(1);
    const row = store.matches.get("m-playoff")!;
    expect(store.teams.get(row.homeTeamId)?.externalId).toBe(realHome);
    expect(store.teams.get(row.awayTeamId)?.externalId).toBe(realAway);
  });

  it("quick sync тянет календарь, но не ходит на страницы матчей без кандидатов", async () => {
    const { fetchChampionatCalendar } = await import(
      "@/lib/football-api/championat/parser"
    );
    const { fetchChampionatMatchDetails } = await import(
      "@/lib/football-api/championat/match-details"
    );
    const { syncChampionatTournamentQuick } = await import("@/lib/football-api/sync");

    vi.mocked(store.prisma.match.findMany).mockResolvedValue([]);

    await syncChampionatTournamentQuick(TOURNAMENT_ID, source);

    expect(fetchChampionatCalendar).toHaveBeenCalled();
    expect(fetchChampionatMatchDetails).not.toHaveBeenCalled();
  });

  it("full sync с enrichVenues вызывает обогащение страниц матчей", async () => {
    const { fetchChampionatMatchDetails } = await import(
      "@/lib/football-api/championat/match-details"
    );
    const { syncChampionatTournament } = await import("@/lib/football-api/sync");

    vi.mocked(store.prisma.match.findMany).mockResolvedValue([
      {
        id: "m-enrich",
        externalId: "championat:match:99",
        status: MatchStatus.SCHEDULED,
        championatFinishedAt: null,
      },
    ] as never);
    vi.mocked(fetchChampionatMatchDetails).mockResolvedValue({
      venueName: "Arena",
      venueCity: "Moscow",
      status: MatchStatus.SCHEDULED,
    } as never);

    await syncChampionatTournament(TOURNAMENT_ID, source, {
      mode: "full",
      enrichVenues: true,
    });

    expect(fetchChampionatMatchDetails).toHaveBeenCalled();
  });

  it("пересчитывает очки, когда обогащение страницы завершает матч", async () => {
    const { fetchChampionatMatchDetails } = await import(
      "@/lib/football-api/championat/match-details"
    );
    const { recalculateMatchScoresForTournament } = await import(
      "@/lib/template-match-admin"
    );
    const { syncChampionatTournament } = await import("@/lib/football-api/sync");

    const startsAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
    store.matches.set("m-page-finished", {
      id: "m-page-finished",
      tournamentId: TOURNAMENT_ID,
      externalId: "championat:match:101",
      stage: "Группа K · Тур 2",
      homeTeamId: "home-team",
      awayTeamId: "away-team",
      startsAt,
      status: MatchStatus.LIVE,
      homeScore: 1,
      awayScore: 0,
      winnerTeamId: null,
      championatTrackActive: true,
      championatFinishedAt: null,
    });
    vi.mocked(store.prisma.match.findMany).mockResolvedValue([
      {
        id: "m-page-finished",
        externalId: "championat:match:101",
        status: MatchStatus.LIVE,
        startsAt,
        homeScore: 1,
        awayScore: 0,
        championatFinishedAt: null,
      },
    ] as never);
    vi.mocked(fetchChampionatMatchDetails).mockResolvedValue({
      status: MatchStatus.FINISHED,
      homeScore: 1,
      awayScore: 0,
    } as never);

    await syncChampionatTournament(TOURNAMENT_ID, source, {
      mode: "full",
      enrichVenues: true,
    });

    expect(recalculateMatchScoresForTournament).toHaveBeenCalledWith(
      TOURNAMENT_ID,
      "m-page-finished",
    );
    vi.useRealTimers();
  });
});
