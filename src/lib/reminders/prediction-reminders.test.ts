import { describe, expect, it } from "vitest";
import { REMINDER_SCHEDULE } from "@/lib/reminders/prediction-reminders";

describe("prediction reminders", () => {
  it("имеет расписание 3ч / 1ч / 15м / старт", () => {
    expect(REMINDER_SCHEDULE.map((s) => s.minutesBefore)).toEqual([
      180, 60, 15, 0,
    ]);
  });
});
