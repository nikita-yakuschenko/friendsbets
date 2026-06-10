import { describe, expect, it, vi, beforeEach } from "vitest";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/lib/game-access", () => ({
  assertGameParticipant: vi.fn(async () => undefined),
  revalidateGamePaths: vi.fn(async () => undefined),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findUnique },
    prediction: { upsert: vi.fn(async () => ({})) },
  },
}));

import { savePredictionAction } from "@/server/actions/predictions";

describe("savePredictionAction knockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("отклоняет ничью в плей-офф", async () => {
    findUnique.mockResolvedValue({
      id: "m1",
      stage: "1/8 финала",
      status: "SCHEDULED",
      startsAt: new Date(Date.now() + 86_400_000),
      homeTeamId: "h1",
      awayTeamId: "a1",
      homeTeam: { externalId: "championat:team:1" },
      awayTeam: { externalId: "championat:team:2" },
    });

    const formData = new FormData();
    formData.set("gameId", "g1");
    formData.set("matchId", "m1");
    formData.set("homeScore", "1");
    formData.set("awayScore", "1");

    const result = await savePredictionAction(undefined, formData);
    expect(result.error).toMatch(/плей-офф/i);
  });
});
