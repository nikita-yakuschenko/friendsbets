import { describe, expect, it } from "vitest";
import {
  getPreMatchReminderFireAt,
  isLiveReminderDue,
  isPreMatchReminderDue,
} from "@/lib/reminders/match-reminder-schedule";

describe("match reminder schedule", () => {
  const kickoff = new Date("2026-06-10T18:00:00.000Z");

  it("прематч: дедлайн за 3 часа до старта", () => {
    const fireAt = getPreMatchReminderFireAt(kickoff, 180);
    expect(fireAt.getTime()).toBe(kickoff.getTime() - 180 * 60 * 1000);
  });

  it("прематч due после дедлайна, пока матч не начался", () => {
    const beforeH3 = new Date(kickoff.getTime() - 200 * 60 * 1000);
    const afterH3 = new Date(kickoff.getTime() - 60 * 60 * 1000);
    expect(isPreMatchReminderDue(beforeH3, kickoff, 180)).toBe(false);
    expect(isPreMatchReminderDue(afterH3, kickoff, 180)).toBe(true);
  });

  it("live due после старта с догоном до 2 ч", () => {
    const atKickoff = kickoff;
    const late = new Date(kickoff.getTime() + 30 * 60 * 1000);
    const tooLate = new Date(kickoff.getTime() + 3 * 60 * 60 * 1000);
    expect(isLiveReminderDue(atKickoff, kickoff)).toBe(true);
    expect(isLiveReminderDue(late, kickoff)).toBe(true);
    expect(isLiveReminderDue(tooLate, kickoff)).toBe(false);
  });
});
