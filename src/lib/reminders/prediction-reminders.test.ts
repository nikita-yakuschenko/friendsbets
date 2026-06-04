import { describe, expect, it } from "vitest";
import {
  matchReminderWindow,
  REMINDER_SCHEDULE,
} from "@/lib/reminders/prediction-reminders";

describe("prediction reminders", () => {
  const now = new Date("2026-06-10T15:00:00Z");

  it("имеет расписание 3ч / 1ч / 15м / старт", () => {
    expect(REMINDER_SCHEDULE.map((s) => s.minutesBefore)).toEqual([
      180, 60, 15, 0,
    ]);
  });

  it("строит окно вокруг kickoff − 3 часа", () => {
    const window = matchReminderWindow(180, now);
    const center = now.getTime() + 180 * 60 * 1000;
    const mid = (window.gte.getTime() + window.lte.getTime()) / 2;
    expect(Math.abs(mid - center)).toBeLessThan(60_000);
  });

  it("окно 3 часа смотрит на более поздний kickoff чем окно 1 час", () => {
    const w3 = matchReminderWindow(180, now);
    const w1 = matchReminderWindow(60, now);
    expect(w3.gte.getTime()).toBeGreaterThan(w1.gte.getTime());
  });
});
