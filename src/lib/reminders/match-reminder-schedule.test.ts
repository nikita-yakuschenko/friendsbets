import { describe, expect, it } from "vitest";
import { DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS } from "@/lib/match-kickoff-delay";
import {
  getMatchReminderFireAt,
  isMatchReminderDue,
  MATCH_REMINDER_SCHEDULE,
} from "@/lib/reminders/match-reminder-schedule";

describe("match reminder schedule", () => {
  const kickoff = new Date("2026-06-10T20:00:00.000Z"); // 23:00 MSK

  const h1Slot = MATCH_REMINDER_SCHEDULE.find((s) => s.minutesBefore === 60)!;
  const liveSlot = MATCH_REMINDER_SCHEDULE.find((s) => s.matchStarted)!;

  it("прематч: дедлайн за 1 час до kickoff", () => {
    const fireAt = getMatchReminderFireAt(kickoff, h1Slot);
    expect(fireAt.getTime()).toBe(kickoff.getTime() - 60 * 60 * 1000);
  });

  it("прематч due после дедлайна, пока матч не начался", () => {
    const beforeH1 = new Date(kickoff.getTime() - 90 * 60 * 1000);
    const afterH1 = new Date(kickoff.getTime() - 30 * 60 * 1000);
    expect(isMatchReminderDue(beforeH1, kickoff, h1Slot)).toBe(false);
    expect(isMatchReminderDue(afterH1, kickoff, h1Slot)).toBe(true);
  });

  it("LIVE не шлёт за 5 минут до kickoff (23:00 → не в 22:55)", () => {
    const fiveMinBefore = new Date("2026-06-10T19:55:00.000Z"); // 22:55 MSK
    expect(isMatchReminderDue(fiveMinBefore, kickoff, liveSlot)).toBe(false);
  });

  it("LIVE не шлёт в расписание kickoff, только после задержки раскрытия", () => {
    expect(isMatchReminderDue(kickoff, kickoff, liveSlot)).toBe(false);
    const effectiveKickoff = new Date(
      kickoff.getTime() + DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS,
    );
    expect(isMatchReminderDue(effectiveKickoff, kickoff, liveSlot)).toBe(true);
  });

  it("за 5 минут до kickoff прематч H1 уже due, LIVE — нет", () => {
    const fiveMinBefore = new Date("2026-06-10T19:55:00.000Z");
    expect(isMatchReminderDue(fiveMinBefore, kickoff, h1Slot)).toBe(true);
    expect(isMatchReminderDue(fiveMinBefore, kickoff, liveSlot)).toBe(false);
  });

  it("live due после effective kickoff с догоном до 2 ч", () => {
    const effectiveKickoff = new Date(
      kickoff.getTime() + DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS,
    );
    const late = new Date(effectiveKickoff.getTime() + 30 * 60 * 1000);
    const tooLate = new Date(effectiveKickoff.getTime() + 3 * 60 * 60 * 1000);
    expect(isMatchReminderDue(late, kickoff, liveSlot)).toBe(true);
    expect(isMatchReminderDue(tooLate, kickoff, liveSlot)).toBe(false);
  });

  it("fireAt для LIVE — effective kickoff", () => {
    expect(getMatchReminderFireAt(kickoff, liveSlot).getTime()).toBe(
      kickoff.getTime() + DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS,
    );
  });
});
