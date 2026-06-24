import { beforeEach, describe, expect, it, vi } from "vitest";
const sendEmailMock = vi.fn().mockResolvedValue(undefined);
const sendTelegramMock = vi.fn().mockResolvedValue(undefined);
const createNotificationMock = vi.fn().mockResolvedValue(undefined);
const findOpeningMock = vi.fn();

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

vi.mock("@/lib/telegram/format", () => ({
  appendTelegramChannelFooter: (text: string) => text,
}));

vi.mock("@/lib/create-user-notification", () => ({
  createUserNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

vi.mock("@/lib/tournament-opening-reminder", () => ({
  findOpeningMatchForTournament: (...args: unknown[]) => findOpeningMock(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findMany: vi.fn() },
    game: { findMany: vi.fn() },
    prediction: { findMany: vi.fn() },
    predictionReminder: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { sendOpeningMatchH24Reminders } from "@/lib/reminders/opening-match-h24-reminder";

/** Матч 11 июля 22:00 МСК → fire 10 июля 22:35 МСК */
const openingMatch = {
  id: "match-open",
  tournamentId: "tour-1",
  startsAt: new Date("2026-07-11T19:00:00.000Z"),
  homeTeam: {
    name: "Мексика",
    countryCode: "mx",
    externalId: "championat:team:1",
  },
  awayTeam: {
    name: "ЮАР",
    countryCode: "za",
    externalId: "championat:team:2",
  },
};

describe("opening match h24 reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.match.findMany).mockResolvedValue([openingMatch] as never);
    findOpeningMock.mockResolvedValue(openingMatch);
    vi.mocked(prisma.game.findMany).mockResolvedValue([
      {
        id: "game-1",
        title: "Друзья",
        inviteCode: "ABC123",
        participants: [
          {
            userId: "user-1",
            displayName: "Иван",
            user: {
              id: "user-1",
              email: "ivan@test.com",
              name: "Иван",
              emailVerifiedAt: new Date(),
              telegramChatId: BigInt(42),
            },
          },
          {
            userId: "user-2",
            displayName: "Пётр",
            user: {
              id: "user-2",
              email: "petr@test.com",
              name: "Пётр",
              emailVerifiedAt: null,
              telegramChatId: null,
            },
          },
        ],
      },
    ] as never);
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      { gameId: "game-1", matchId: "match-open", userId: "user-1" },
    ] as never);
    vi.mocked(prisma.predictionReminder.create).mockResolvedValue({} as never);
    vi.mocked(prisma.predictionReminder.deleteMany).mockResolvedValue({
      count: 0,
    } as never);
  });

  it("шлёт всем участникам с разным текстом", async () => {
    const now = new Date("2026-07-10T19:40:00.000Z");
    const result = await sendOpeningMatchH24Reminders(now);

    expect(result.sent).toBe(2);
    expect(createNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendTelegramMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const withPredictionBody = createNotificationMock.mock.calls[0]![0].body as string;
    const withoutPredictionBody = createNotificationMock.mock.calls[1]![0].body as string;
    expect(withPredictionBody).toContain("уже сделал прогноз");
    expect(withoutPredictionBody).toContain("ещё не сделал прогноз");
  });

  it("не шлёт повторно при занятом слоте H24_OPENING", async () => {
    vi.mocked(prisma.predictionReminder.create).mockRejectedValue({
      code: "P2002",
    });

    const now = new Date("2026-07-10T19:40:00.000Z");
    const result = await sendOpeningMatchH24Reminders(now);
    expect(result.skipped).toBe(2);
    expect(result.sent).toBe(0);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("не шлёт до 22:35 МСК канун дня (10 июля 22:30 МСК)", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValue([openingMatch] as never);

    const earlyNow = new Date("2026-07-10T19:30:00.000Z");
    const result = await sendOpeningMatchH24Reminders(earlyNow);

    expect(result.sent).toBe(0);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("догоняет после 22:35 МСК (10 июля 22:40 МСК)", async () => {
    const lateNow = new Date("2026-07-10T19:40:00.000Z");

    const result = await sendOpeningMatchH24Reminders(lateNow);

    expect(result.sent).toBe(2);
    expect(createNotificationMock).toHaveBeenCalledTimes(2);
  });

  it("пропускает матч, который не является открытием турнира", async () => {
    findOpeningMock.mockResolvedValue({
      ...openingMatch,
      id: "other-match",
    });

    const now = new Date("2026-07-10T19:40:00.000Z");
    const result = await sendOpeningMatchH24Reminders(now);
    expect(result.sent).toBe(0);
    expect(prisma.game.findMany).not.toHaveBeenCalled();
  });
});
