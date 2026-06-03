import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-1",
    email: "u@test.com",
    name: "User",
    role: "PARTICIPANT",
  })),
}));

vi.mock("@/lib/game-access", () => ({
  assertGameParticipant: vi.fn(),
  revalidateGamePaths: vi.fn(),
  resolveGameIdFromRoute: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findUnique: vi.fn() },
    prediction: { upsert: vi.fn() },
  },
}));

import { assertGameParticipant } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { savePredictionAction } from "@/server/actions/predictions";

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

const futureStart = new Date(Date.now() + 60 * 60 * 1000);

describe("savePredictionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertGameParticipant).mockResolvedValue(undefined);
  });

  it("отклоняет некорректный счёт", async () => {
    const result = await savePredictionAction(
      undefined,
      form({ gameId: "g1", matchId: "m1", homeScore: "-1", awayScore: "0" }),
    );
    expect(result.error).toMatch(/корректный счёт/i);
  });

  it("не даёт прогноз после начала матча", async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: "m1",
      startsAt: new Date(Date.now() - 60_000),
      status: MatchStatus.LIVE,
      homeTeam: { name: "A", externalId: "championat:team:1" },
      awayTeam: { name: "B", externalId: "championat:team:2" },
      homeTeamId: "h1",
      awayTeamId: "a1",
    } as never);

    const result = await savePredictionAction(
      undefined,
      form({ gameId: "g1", matchId: "m1", homeScore: "1", awayScore: "0" }),
    );
    expect(result.error).toMatch(/после начала/i);
  });

  it("сохраняет прогноз на перенесённый матч", async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: "m1",
      startsAt: futureStart,
      status: MatchStatus.POSTPONED,
      homeTeam: { name: "A", externalId: "championat:team:1" },
      awayTeam: { name: "B", externalId: "championat:team:2" },
      homeTeamId: "h1",
      awayTeamId: "a1",
    } as never);

    const result = await savePredictionAction(
      undefined,
      form({ gameId: "g1", matchId: "m1", homeScore: "2", awayScore: "2" }),
    );

    expect(result.success).toBe(true);
    expect(prisma.prediction.upsert).toHaveBeenCalled();
  });

  it("отклоняет неучастника турнира", async () => {
    vi.mocked(assertGameParticipant).mockRejectedValue(new Error("FORBIDDEN"));

    const result = await savePredictionAction(
      undefined,
      form({ gameId: "g1", matchId: "m1", homeScore: "1", awayScore: "0" }),
    );
    expect(result.error).toMatch(/не участник/i);
  });
});
