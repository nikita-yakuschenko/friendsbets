import { describe, expect, it } from "vitest";
import {
  getMatchReminderFireAt,
  isMatchReminderDue,
  MATCH_REMINDER_SCHEDULE,
} from "@/lib/reminders/match-reminder-schedule";

describe("match reminder schedule", () => {
  const kickoff = new Date("2026-06-10T20:00:00.000Z"); // 23:00 MSK

  const liveSlot = MATCH_REMINDER_SCHEDULE.find((s) => s.matchStarted)!;
  const m15Slot = MATCH_REMINDER_SCHEDULE.find(
    (s) => s.minutesBefore === 15,
  )!;

  it("прематч: дедлайн за 3 часа до kickoff", () => {
    const h3 = MATCH_REMINDER_SCHEDULE[0]!;
    const fireAt = getMatchReminderFireAt(kickoff, h3);
    expect(fireAt.getTime()).toBe(kickoff.getTime() - 180 * 60 * 1000);
  });

  it("прематч due после дедлайна, пока матч не начался", () => {
    const h3 = MATCH_REMINDER_SCHEDULE[0]!;
    const beforeH3 = new Date(kickoff.getTime() - 200 * 60 * 1000);
    const afterH3 = new Date(kickoff.getTime() - 60 * 60 * 1000);
    expect(isMatchReminderDue(beforeH3, kickoff, h3)).toBe(false);
    expect(isMatchReminderDue(afterH3, kickoff, h3)).toBe(true);
  });

  it("LIVE не шлёт за 5 минут до kickoff (23:00 → не в 22:55)", () => {
    const fiveMinBefore = new Date("2026-06-10T19:55:00.000Z"); // 22:55 MSK
    expect(isMatchReminderDue(fiveMinBefore, kickoff, liveSlot)).toBe(false);
  });

  it("LIVE шлёт ровно в kickoff", () => {
    expect(isMatchReminderDue(kickoff, kickoff, liveSlot)).toBe(true);
  });

  it("M15 в 22:55 для kickoff 23:00 — due, но это не LIVE", () => {
    const fiveMinBefore = new Date("2026-06-10T19:55:00.000Z");
    expect(isMatchReminderDue(fiveMinBefore, kickoff, m15Slot)).toBe(true);
    expect(isMatchReminderDue(fiveMinBefore, kickoff, liveSlot)).toBe(false);
  });

  it("live due после старта с догоном до 2 ч", () => {
    const late = new Date(kickoff.getTime() + 30 * 60 * 1000);
    const tooLate = new Date(kickoff.getTime() + 3 * 60 * 60 * 1000);
    expect(isMatchReminderDue(late, kickoff, liveSlot)).toBe(true);
    expect(isMatchReminderDue(tooLate, kickoff, liveSlot)).toBe(false);
  });
});
