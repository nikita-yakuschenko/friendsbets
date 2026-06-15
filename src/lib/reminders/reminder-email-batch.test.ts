import { describe, expect, it, vi, beforeEach } from "vitest";

const sendEmailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

import { ReminderEmailBatch } from "@/lib/reminders/reminder-email-batch";

describe("ReminderEmailBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("объединяет несколько событий в одно письмо", async () => {
    const batch = new ReminderEmailBatch();

    batch.enqueue({
      userId: "u1",
      email: "u1@test.com",
      userName: "U1",
      emailVerifiedAt: new Date(),
      notifyByEmail: true,
      section: {
        type: "prematch_missing",
        gameTitle: "Cup",
        inviteCode: "ABC",
        matches: [
          {
            homeTeam: "A",
            awayTeam: "B",
            startsAt: new Date("2026-06-10T18:00:00Z"),
            timeLabel: "1 час",
          },
        ],
      },
    });

    batch.enqueue({
      userId: "u1",
      email: "u1@test.com",
      userName: "U1",
      emailVerifiedAt: new Date(),
      notifyByEmail: true,
      section: {
        type: "match_started",
        gameTitle: "Cup",
        inviteCode: "ABC",
        matches: [
          {
            homeTeam: "C",
            awayTeam: "D",
            predictedHome: 1,
            predictedAway: 0,
          },
        ],
      },
    });

    const result = await batch.flush();

    expect(result.sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "u1@test.com" }),
    );
  });

  it("сливает prematch_missing по одному турниру", async () => {
    const batch = new ReminderEmailBatch();

    const base = {
      userId: "u1",
      email: "u1@test.com",
      userName: "U1",
      emailVerifiedAt: new Date(),
      notifyByEmail: true,
    };

    batch.enqueue({
      ...base,
      section: {
        type: "prematch_missing",
        gameTitle: "Cup",
        inviteCode: "ABC",
        matches: [
          {
            homeTeam: "A",
            awayTeam: "B",
            startsAt: new Date("2026-06-10T18:00:00Z"),
            timeLabel: "1 час",
          },
        ],
      },
    });

    batch.enqueue({
      ...base,
      section: {
        type: "prematch_missing",
        gameTitle: "Cup",
        inviteCode: "ABC",
        matches: [
          {
            homeTeam: "C",
            awayTeam: "D",
            startsAt: new Date("2026-06-10T21:00:00Z"),
            timeLabel: "1 час",
          },
        ],
      },
    });

    await batch.flush();

    const html = String((sendEmailMock.mock.calls[0]?.[0] as { html?: string })?.html);
    expect(html).toContain("A");
    expect(html).toContain("C");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});
