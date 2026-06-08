import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MatchStatus,
  PredictionReminderKind,
  UserNotificationKind,
} from "@/generated/prisma/client";

const sendEmailMock = vi.fn().mockResolvedValue(undefined);
const recalcMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@/lib/telegram/api", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/telegram/config", () => ({
  isTelegramConfigured: () => false,
  getTelegramChannelUrl: () => null,
}));

vi.mock("@/lib/template-match-admin", () => ({
  recalculateMatchScoresForTournament: (...args: unknown[]) => recalcMock(...args),
}));

vi.mock("@/lib/leaderboard/compute-game-leaderboard", () => ({
  computeGameLeaderboard: vi.fn().mockResolvedValue([
    { userId: "user-1", displayName: "U1", totalPoints: 4, rank: 1 },
  ]),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findUnique: vi.fn(), findMany: vi.fn() },
    game: { findMany: vi.fn() },
    prediction: { findMany: vi.fn() },
    predictionReminder: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    userNotification: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import {
  handleMatchFinished,
  notifyMatchResultParticipants,
} from "@/lib/match-result-notifications";

const finishedMatch = {
  id: "match-1",
  tournamentId: "tour-1",
  status: MatchStatus.FINISHED,
  homeScore: 2,
  awayScore: 1,
  startsAt: new Date("2026-06-10T18:00:00Z"),
  homeTeam: { name: "A", countryCode: "RU" },
  awayTeam: { name: "B", countryCode: "DE" },
};

describe("match result notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.match.findUnique).mockResolvedValue(finishedMatch as never);
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: "match-2",
        startsAt: new Date("2026-06-12T18:00:00Z"),
        homeTeam: { name: "C", countryCode: "FR", externalId: "championat:team:3" },
        awayTeam: { name: "D", countryCode: "ES", externalId: "championat:team:4" },
      },
    ] as never);
    vi.mocked(prisma.game.findMany).mockResolvedValue([
      {
        id: "game-1",
        title: "Cup",
        inviteCode: "ABC",
        scoringRule: { code: "FOOTBALL_CLASSIC" },
        participants: [
          {
            userId: "user-1",
            displayName: "U1",
            user: {
              id: "user-1",
              email: "u1@test.com",
              name: "U1",
              emailVerifiedAt: new Date(),
              telegramChatId: null,
            },
          },
        ],
      },
    ] as never);
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      {
        gameId: "game-1",
        userId: "user-1",
        homeScore: 2,
        awayScore: 1,
      },
    ] as never);
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.create).mockResolvedValue({} as never);
    vi.mocked(prisma.userNotification.create).mockResolvedValue({} as never);
  });

  it("handleMatchFinished пересчитывает очки и шлёт уведомление", async () => {
    await handleMatchFinished("tour-1", "match-1");
    expect(recalcMock).toHaveBeenCalledWith("tour-1", "match-1");
    expect(prisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: UserNotificationKind.MATCH_RESULT,
        }),
      }),
    );
    expect(sendEmailMock).toHaveBeenCalled();
  });

  it("не шлёт повторно при MATCH_FINISHED", async () => {
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([
      { gameId: "game-1", userId: "user-1" },
    ] as never);

    const result = await notifyMatchResultParticipants("tour-1", "match-1");
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(prisma.userNotification.create).not.toHaveBeenCalled();
  });
});
