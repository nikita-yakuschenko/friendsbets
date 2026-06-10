import { describe, expect, it } from "vitest";
import { computeAdaptiveReminderPollDelayMs } from "@/lib/reminders/adaptive-poll-delay";

describe("computeAdaptiveReminderPollDelayMs", () => {
  const now = new Date("2026-06-10T12:00:00.000Z");

  it("без событий — раз в час", () => {
    expect(computeAdaptiveReminderPollDelayMs(now, null)).toBe(60 * 60 * 1000);
  });

  it("до события > 1 ч — раз в час", () => {
    const fire = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    expect(computeAdaptiveReminderPollDelayMs(now, fire)).toBe(60 * 60 * 1000);
  });

  it("до события < 1 ч — раз в 10 мин", () => {
    const fire = new Date(now.getTime() + 30 * 60 * 1000);
    expect(computeAdaptiveReminderPollDelayMs(now, fire)).toBe(10 * 60 * 1000);
  });

  it("до события < 10 мин — раз в минуту", () => {
    const fire = new Date(now.getTime() + 5 * 60 * 1000);
    expect(computeAdaptiveReminderPollDelayMs(now, fire)).toBe(60 * 1000);
  });

  it("до события < 1 мин — раз в 5 сек", () => {
    const fire = new Date(now.getTime() + 30 * 1000);
    expect(computeAdaptiveReminderPollDelayMs(now, fire)).toBe(5 * 1000);
  });

  it("до события < 5 сек — раз в секунду", () => {
    const fire = new Date(now.getTime() + 3 * 1000);
    expect(computeAdaptiveReminderPollDelayMs(now, fire)).toBe(1000);
  });

  it("контрольное время наступило — сразу", () => {
    const fire = new Date(now.getTime() - 1000);
    expect(computeAdaptiveReminderPollDelayMs(now, fire)).toBe(0);
  });
});
