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
    match: { findMany: vi.fn() },
    prediction: { findMany: vi.fn() },
    predictionReminder: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { sendDuePredictionReminders } from "@/lib/reminders/prediction-reminders";

const kickoff = new Date("2026-06-10T18:00:00Z");
const now = new Date("2026-06-10T15:00:00Z");

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
    vi.mocked(prisma.match.findMany).mockImplementation(async (args) => {
      const startsAt = (args as { where?: { startsAt?: { gte?: Date; lte?: Date } } })
        ?.where?.startsAt;
      const t = kickoff.getTime();
      if (
        startsAt?.gte &&
        startsAt?.lte &&
        (t < startsAt.gte.getTime() || t > startsAt.lte.getTime())
      ) {
        return [] as never;
      }
      return [baseMatch] as never;
    });
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.predictionReminder.create).mockResolvedValue({} as never);
  });

  it("отправляет напоминание участнику без прогноза", async () => {
    const result = await sendDuePredictionReminders(now);

    expect(result.sent).toBeGreaterThan(0);
    expect(sendEmailMock).toHaveBeenCalled();
    expect(prisma.predictionReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          kind: PredictionReminderKind.H3,
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
        kind: PredictionReminderKind.H3,
      },
      {
        gameId: "game-1",
        matchId: "match-1",
        userId: "org-1",
        kind: PredictionReminderKind.H3,
      },
      {
        gameId: "game-1",
        matchId: "match-1",
        userId: "org-1",
        kind: PredictionReminderKind.H3_ADMIN,
      },
    ] as never);

    const result = await sendDuePredictionReminders(now);

    expect(result.skipped).toBeGreaterThan(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("пропускает неподтверждённый email", async () => {
    const result = await sendDuePredictionReminders(now);

    const callsForUnverified = sendEmailMock.mock.calls.filter((c) =>
      String((c[0] as { to?: string })?.to).includes("u2@test.com"),
    );
    expect(callsForUnverified).toHaveLength(0);
    expect(result.checked).toBeGreaterThan(0);
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

  it("ошибка email не создаёт sent record", async () => {
    sendEmailMock.mockRejectedValue(new Error("smtp down"));

    const result = await sendDuePredictionReminders(now);

    expect(result.errors).toBeGreaterThan(0);
    expect(prisma.predictionReminder.create).not.toHaveBeenCalled();
  });

  it("использует пакетные findMany вместо findUnique в цикле", async () => {
    await sendDuePredictionReminders(now);

    expect(prisma.prediction.findMany).toHaveBeenCalled();
    expect(prisma.predictionReminder.findMany).toHaveBeenCalled();
    expect(
      (prisma.predictionReminder as { findUnique?: unknown }).findUnique,
    ).toBeUndefined();
  });
});
