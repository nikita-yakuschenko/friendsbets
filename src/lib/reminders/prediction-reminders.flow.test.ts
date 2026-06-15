import { DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS } from "@/lib/match-kickoff-delay";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GameParticipantRole,
  MatchStatus,
  PredictionReminderKind,
} from "@/generated/prisma/client";

const sendEmailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findMany: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    prediction: { findMany: vi.fn() },
    predictionReminder: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    userNotification: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { sendDuePredictionReminders } from "@/lib/reminders/prediction-reminders";

const kickoff = new Date("2026-06-10T18:00:00Z");
const now = new Date("2026-06-10T17:00:00Z");

const baseMatch = {
  id: "match-1",
  status: MatchStatus.SCHEDULED,
  startsAt: kickoff,
  homeTeam: { name: "A", externalId: "championat:team:1" },
  awayTeam: { name: "B", externalId: "championat:team:2" },
  tournament: {
    games: [
      {
        id: "game-1",
        title: "Test cup",
        inviteCode: "TEST01",
        createdById: "org-1",
        createdBy: {
          id: "org-1",
          email: "org@test.com",
          name: "Org",
          emailVerifiedAt: new Date(),
        },
        participants: [
          {
            userId: "user-1",
            displayName: "U1",
            role: GameParticipantRole.PARTICIPANT,
            user: {
              id: "user-1",
              email: "u1@test.com",
              name: "U1",
              emailVerifiedAt: new Date(),
            },
          },
          {
            userId: "user-2",
            displayName: "U2",
            role: GameParticipantRole.PARTICIPANT,
            user: {
              id: "user-2",
              email: "u2@test.com",
              name: "U2",
              emailVerifiedAt: null,
            },
          },
          {
            userId: "org-1",
            displayName: "Org",
            role: GameParticipantRole.ORGANIZER,
            user: {
              id: "org-1",
              email: "org@test.com",
              name: "Org",
              emailVerifiedAt: new Date(),
            },
          },
        ],
      },
    ],
  },
};

describe("sendDuePredictionReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(prisma.match.findMany).mockResolvedValue([baseMatch] as never);
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.create).mockResolvedValue({} as never);
    vi.mocked(prisma.userNotification.create).mockResolvedValue({} as never);
  });

  it("отправляет напоминание участнику без прогноза", async () => {
    const result = await sendDuePredictionReminders(now);

    expect(result.sent).toBeGreaterThan(0);
    expect(sendEmailMock).toHaveBeenCalled();
    expect(prisma.userNotification.create).toHaveBeenCalled();
    expect(prisma.predictionReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          kind: PredictionReminderKind.H1,
        }),
      }),
    );
  });

  it("пропускает уже отправленные (bulk findMany)", async () => {
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([
      {
        gameId: "game-1",
        matchId: "match-1",
        userId: "user-1",
        kind: PredictionReminderKind.H1,
      },
      {
        gameId: "game-1",
        matchId: "match-1",
        userId: "org-1",
        kind: PredictionReminderKind.H1,
      },
      {
        gameId: "game-1",
        matchId: "match-1",
        userId: "org-1",
        kind: PredictionReminderKind.H1_ADMIN,
      },
    ] as never);

    const result = await sendDuePredictionReminders(now);

    expect(result.skipped).toBeGreaterThan(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("без подтверждённого email всё равно шлёт in-app", async () => {
    const result = await sendDuePredictionReminders(now);

    const callsForUnverified = sendEmailMock.mock.calls.filter((c) =>
      String((c[0] as { to?: string })?.to).includes("u2@test.com"),
    );
    expect(callsForUnverified).toHaveLength(0);
    expect(prisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-2" }),
      }),
    );
    expect(result.sent).toBeGreaterThan(0);
  });

  it("не шлёт участникам с прогнозом", async () => {
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      { gameId: "game-1", matchId: "match-1", userId: "user-1" },
      { gameId: "game-1", matchId: "match-1", userId: "user-2" },
      { gameId: "game-1", matchId: "match-1", userId: "org-1" },
    ] as never);

    const result = await sendDuePredictionReminders(now);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("шлёт организатору список missing", async () => {
    await sendDuePredictionReminders(now);

    const adminCalls = sendEmailMock.mock.calls.filter((c) =>
      String((c[0] as { subject?: string })?.subject).includes("кто не поставил"),
    );
    expect(adminCalls.length).toBeGreaterThan(0);
  });

  it("ошибка email не блокирует in-app и sent record", async () => {
    sendEmailMock.mockRejectedValue(new Error("smtp down"));

    const result = await sendDuePredictionReminders(now);

    expect(prisma.userNotification.create).toHaveBeenCalled();
    expect(prisma.predictionReminder.create).toHaveBeenCalled();
    expect(result.sent).toBeGreaterThan(0);
  });

  it("использует пакетные findMany вместо findUnique в цикле", async () => {
    await sendDuePredictionReminders(now);

    expect(prisma.prediction.findMany).toHaveBeenCalled();
    expect(prisma.predictionReminder.findMany).toHaveBeenCalled();
    expect(
      (prisma.predictionReminder as { findUnique?: unknown }).findUnique,
    ).toBeUndefined();
  });

  it("не шлёт LIVE за 5 минут до kickoff (23:00 МСК)", async () => {
    const kickoff23 = new Date("2026-06-10T20:00:00.000Z"); // 23:00 MSK
    const fiveMinBefore = new Date("2026-06-10T19:55:00.000Z"); // 22:55 MSK
    vi.setSystemTime(fiveMinBefore);

    const match23 = {
      ...baseMatch,
      id: "match-23",
      startsAt: kickoff23,
    };

    vi.mocked(prisma.match.findMany).mockImplementation(async (args) => {
      const where = (args as { where?: { startsAt?: Record<string, Date> } })
        ?.where?.startsAt;
      if (!where) return [] as never;
      const t = kickoff23.getTime();
      if (where.gt && t <= where.gt.getTime()) return [] as never;
      if (where.lte && t > where.lte.getTime()) return [] as never;
      if (where.gte && t < where.gte.getTime()) return [] as never;
      return [match23] as never;
    });

    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      {
        gameId: "game-1",
        matchId: "match-23",
        userId: "user-1",
        homeScore: 3,
        awayScore: 0,
      },
      {
        gameId: "game-1",
        matchId: "match-23",
        userId: "user-2",
        homeScore: 0,
        awayScore: 0,
      },
      {
        gameId: "game-1",
        matchId: "match-23",
        userId: "org-1",
        homeScore: 1,
        awayScore: 1,
      },
    ] as never);

    const result = await sendDuePredictionReminders(fiveMinBefore);

    const liveCreates = vi
      .mocked(prisma.predictionReminder.create)
      .mock.calls.filter(
        (c) =>
          (c[0] as { data?: { kind?: string } })?.data?.kind ===
          PredictionReminderKind.LIVE,
      );
    expect(liveCreates).toHaveLength(0);
    expect(result.sent).toBe(0);
  });

  it("шлёт LIVE, если Championat уже перевёл матч в LIVE", async () => {
    const kickoff23 = new Date("2026-06-10T20:00:00.000Z");
    const afterReveal = new Date(
      kickoff23.getTime() + DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS,
    );
    vi.setSystemTime(afterReveal);

    const liveMatch = {
      ...baseMatch,
      id: "match-live",
      status: MatchStatus.LIVE,
      startsAt: kickoff23,
    };

    vi.mocked(prisma.match.findMany).mockImplementation(async (args) => {
      const where = (args as { where?: { startsAt?: Record<string, Date> } })
        ?.where?.startsAt;
      if (!where) return [] as never;
      const t = kickoff23.getTime();
      if ("gt" in where && where.gt) {
        return [] as never;
      }
      if ("gte" in where && where.gte && where.lte) {
        if (t >= where.gte.getTime() && t <= where.lte.getTime()) {
          return [liveMatch] as never;
        }
      }
      return [] as never;
    });

    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      {
        gameId: "game-1",
        matchId: "match-live",
        userId: "user-1",
        homeScore: 1,
        awayScore: 0,
      },
      {
        gameId: "game-1",
        matchId: "match-live",
        userId: "user-2",
        homeScore: 2,
        awayScore: 1,
      },
      {
        gameId: "game-1",
        matchId: "match-live",
        userId: "org-1",
        homeScore: 0,
        awayScore: 0,
      },
    ] as never);

    const result = await sendDuePredictionReminders(afterReveal);

    const liveCreates = vi
      .mocked(prisma.predictionReminder.create)
      .mock.calls.filter(
        (c) =>
          (c[0] as { data?: { kind?: string } })?.data?.kind ===
          PredictionReminderKind.LIVE,
      );
    expect(liveCreates.length).toBeGreaterThan(0);
    expect(result.sent).toBeGreaterThan(0);
  });

  it("шлёт H1, если Championat ошибочно перевёл матч в LIVE до kickoff", async () => {
    const phantomLiveMatch = {
      ...baseMatch,
      id: "match-phantom-live",
      status: MatchStatus.LIVE,
    };

    vi.mocked(prisma.match.findMany).mockImplementation(async (args) => {
      const where = (args as { where?: { startsAt?: Record<string, Date> } })
        ?.where?.startsAt;
      if (!where || !("gt" in where) || !where.gt) return [] as never;
      const t = kickoff.getTime();
      if (t <= where.gt.getTime()) return [] as never;
      if (where.lte && t > where.lte.getTime()) return [] as never;
      return [phantomLiveMatch] as never;
    });

    const result = await sendDuePredictionReminders(now);

    expect(prisma.predictionReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          kind: PredictionReminderKind.H1,
        }),
      }),
    );
    expect(result.sent).toBeGreaterThan(0);
  });
});
