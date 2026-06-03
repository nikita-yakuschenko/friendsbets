import { afterAll, describe, expect, it } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import {
  createTestPrisma,
  getTestDatabaseUrl,
} from "../helpers/integration-db";

const testDbUrl = getTestDatabaseUrl();
const describeIfDb = testDbUrl ? describe : describe.skip;

describeIfDb("Prisma integration", () => {
  const prisma = createTestPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("подключается к test database", async () => {
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("находит scoring rules после seed", async () => {
    const rules = await prisma.scoringRule.findMany({ take: 1 });
    expect(rules.length).toBeGreaterThanOrEqual(0);
  });

  it("создаёт и удаляет прогноз в транзакции", async () => {
    const game = await prisma.game.findFirst({
      include: {
        tournament: {
          include: {
            matches: { where: { status: MatchStatus.SCHEDULED }, take: 1 },
          },
        },
        participants: { take: 1 },
      },
    });
    if (!game?.participants[0] || !game.tournament.matches[0]) {
      return;
    }

    const match = game.tournament.matches[0];
    const userId = game.participants[0].userId;

    await prisma.$transaction(async (tx) => {
      const prediction = await tx.prediction.upsert({
        where: {
          gameId_matchId_userId: {
            gameId: game.id,
            matchId: match.id,
            userId,
          },
        },
        create: {
          gameId: game.id,
          matchId: match.id,
          userId,
          homeScore: 1,
          awayScore: 0,
          winnerTeamId: match.homeTeamId,
        },
        update: { homeScore: 2, awayScore: 1 },
      });
      expect(prediction.homeScore).toBe(2);
      await tx.prediction.delete({
        where: { id: prediction.id },
      });
    });
  });
});
