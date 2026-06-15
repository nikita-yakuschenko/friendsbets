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
      delete: vi.fn(),
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
              notifyByEmail: true,
              notifyByTelegram: false,
              notifyInApp: true,
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

  it("не шлёт повторно, если claim занят параллельным воркером", async () => {
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.create).mockRejectedValue({
      code: "P2002",
    });

    const result = await notifyMatchResultParticipants("tour-1", "match-1");
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(prisma.userNotification.create).not.toHaveBeenCalled();
  });

  it("в следующем матче указывает ближайший ещё не начавшийся", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T23:55:00Z"));

    vi.mocked(prisma.match.findMany).mockResolvedValue([
      {
        id: "match-live",
        startsAt: new Date("2026-06-13T20:00:00Z"),
        status: MatchStatus.LIVE,
        homeTeam: { name: "Матч 2", countryCode: null, externalId: "championat:team:2" },
        awayTeam: { name: "B", countryCode: null, externalId: "championat:team:3" },
      },
      {
        id: "match-next",
        startsAt: new Date("2026-06-14T00:00:00Z"),
        status: MatchStatus.SCHEDULED,
        homeTeam: { name: "Матч 3", countryCode: null, externalId: "championat:team:4" },
        awayTeam: { name: "D", countryCode: null, externalId: "championat:team:5" },
      },
    ] as never);

    await notifyMatchResultParticipants("tour-1", "match-1");

    expect(prisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: expect.stringContaining("Матч 3 — D"),
        }),
      }),
    );
    expect(prisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: expect.not.stringContaining("Матч 2 — B"),
        }),
      }),
    );

    vi.useRealTimers();
  });

  it("резервирует слот до отправки уведомлений", async () => {
    const order: string[] = [];
    vi.mocked(prisma.predictionReminder.create).mockImplementation(async () => {
      order.push("claim");
      return {} as never;
    });
    vi.mocked(prisma.userNotification.create).mockImplementation(async () => {
      order.push("notify");
      return {} as never;
    });

    await notifyMatchResultParticipants("tour-1", "match-1");
    expect(order).toEqual(["claim", "notify"]);
  });
});
