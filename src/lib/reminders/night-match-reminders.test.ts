import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MatchStatus,
  PredictionReminderKind,
  UserNotificationKind,
} from "@/generated/prisma/client";

const sendEmailMock = vi.fn().mockResolvedValue(undefined);
const sendTelegramMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@/lib/telegram/api", () => ({
  sendTelegramMessage: (...args: unknown[]) => sendTelegramMock(...args),
}));

vi.mock("@/lib/telegram/config", () => ({
  isTelegramConfigured: () => true,
  getTelegramChannelUrl: () => null,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findMany: vi.fn() },
    prediction: { findMany: vi.fn() },
    predictionReminder: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    userNotification: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { sendNightBatchPredictionReminders } from "@/lib/reminders/night-match-reminders";

const game = {
  id: "game-1",
  title: "Test cup",
  inviteCode: "TEST01",
  participants: [
    {
      userId: "user-1",
      displayName: "U1",
      user: {
        id: "user-1",
        email: "u1@test.com",
        name: "U1",
        emailVerifiedAt: new Date(),
        telegramChatId: BigInt(123),
      },
    },
  ],
};

function nightMatch(id: string, startsAt: Date) {
  return {
    id,
    status: MatchStatus.SCHEDULED,
    startsAt,
    homeTeam: { name: "Home", countryCode: "RU", externalId: "championat:team:1" },
    awayTeam: { name: "Away", countryCode: "DE", externalId: "championat:team:2" },
    tournament: { games: [game] },
  };
}

describe("sendNightBatchPredictionReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.create).mockResolvedValue({} as never);
    vi.mocked(prisma.userNotification.create).mockResolvedValue({} as never);
  });

  it("группирует несколько ночных матчей в одно напоминание в 18:00", async () => {
    const match02 = nightMatch(
      "m1",
      new Date("2026-06-11T23:00:00.000Z"), // 02:00 MSK 12 июня
    );
    const match06 = nightMatch(
      "m2",
      new Date("2026-06-12T03:00:00.000Z"), // 06:00 MSK 12 июня
    );
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      match02,
      match06,
    ] as never);

    const now = new Date("2026-06-11T15:00:00.000Z"); // 18:00 MSK 11 июня
    const result = await sendNightBatchPredictionReminders(now);

    expect(result.sent).toBe(1);
    expect(prisma.userNotification.create).toHaveBeenCalledTimes(1);
    expect(prisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: UserNotificationKind.MISSING_PREDICTION,
          actionInviteCode: "TEST01",
          body: expect.stringContaining(
            "Ты не сделал прогноз на предстоящие матчи",
          ),
        }),
      }),
    );
    expect(prisma.predictionReminder.create).toHaveBeenCalledTimes(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMock).toHaveBeenCalledTimes(1);
  });

  it("не шлёт дневной матч вне ночного окна", async () => {
    const dayMatch = nightMatch(
      "m-day",
      new Date("2026-06-11T17:00:00.000Z"), // 20:00 MSK
    );
    vi.mocked(prisma.match.findMany).mockResolvedValue([dayMatch] as never);

    const now = new Date("2026-06-11T15:00:00.000Z");
    const result = await sendNightBatchPredictionReminders(now);

    expect(result.sent).toBe(0);
    expect(prisma.userNotification.create).not.toHaveBeenCalled();
  });

  it("пропускает уже отправленное H18_NIGHT", async () => {
    const match = nightMatch(
      "m1",
      new Date("2026-06-11T19:00:00.000Z"), // 22:00 MSK
    );
    vi.mocked(prisma.match.findMany).mockResolvedValue([match] as never);
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([
      {
        gameId: "game-1",
        matchId: "m1",
        userId: "user-1",
        kind: PredictionReminderKind.H18_NIGHT,
      },
    ] as never);

    const now = new Date("2026-06-11T15:00:00.000Z");
    const result = await sendNightBatchPredictionReminders(now);

    expect(result.sent).toBe(0);
    expect(result.skipped).toBeGreaterThan(0);
    expect(prisma.userNotification.create).not.toHaveBeenCalled();
  });
});
