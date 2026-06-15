import { describe, expect, it } from "vitest";
import { MATCH_REMINDER_SCHEDULE } from "@/lib/reminders/match-reminder-schedule";

describe("prediction reminders", () => {
  it("имеет расписание 1ч / старт", () => {
    expect(MATCH_REMINDER_SCHEDULE.map((s) => s.minutesBefore)).toEqual([
      60, 0,
    ]);
  });
});
