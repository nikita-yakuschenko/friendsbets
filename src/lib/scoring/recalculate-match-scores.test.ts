import { describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";

const { upsertMock, findManyMock, findUniqueGameMock, findUniqueMatchMock } =
  vi.hoisted(() => ({
    upsertMock: vi.fn(),
    findManyMock: vi.fn(),
    findUniqueGameMock: vi.fn(),
    findUniqueMatchMock: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  prisma: {
    game: { findUnique: findUniqueGameMock },
    match: { findUnique: findUniqueMatchMock },
    prediction: { findMany: findManyMock },
    $transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        predictionScore: { upsert: upsertMock },
      }),
  },
}));

import { persistMatchPredictionScores } from "@/lib/scoring/recalculate-match-scores";

describe("persistMatchPredictionScores", () => {
  it("использует upsert вместо delete+create", async () => {
    findUniqueGameMock.mockResolvedValue({
      scoringRule: { code: "MANY_POINTS" },
    });
    findUniqueMatchMock.mockResolvedValue({
      status: MatchStatus.FINISHED,
      homeScore: 1,
      awayScore: 1,
    });
    findManyMock.mockResolvedValue([
      { id: "pred-1", homeScore: 3, awayScore: 1 },
    ]);
    upsertMock.mockResolvedValue({});

    await persistMatchPredictionScores("game-1", "match-1");

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { predictionId: "pred-1" },
        create: expect.objectContaining({
          points: 1,
          reason: "Голы одной команды",
        }),
        update: expect.objectContaining({
          points: 1,
          reason: "Голы одной команды",
        }),
      }),
    );
  });
});
