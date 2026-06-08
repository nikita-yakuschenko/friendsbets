import { describe, expect, it } from "vitest";
import {
  getNightReminderFireAt,
  isNightWindowKickoffMsk,
} from "@/lib/reminders/night-match-schedule";
import { getMskCalendarDateKey } from "@/lib/football-api/championat/match-msk-time";

describe("night match reminder schedule", () => {
  it("20:00 МСК — не ночное окно", () => {
    const kickoff = new Date("2026-06-11T17:00:00.000Z"); // 20:00 MSK
    expect(isNightWindowKickoffMsk(kickoff)).toBe(false);
    expect(getNightReminderFireAt(kickoff)).toBeNull();
  });

  it("22:00 МСК 11 июня → напоминание 18:00 11 июня", () => {
    const kickoff = new Date("2026-06-11T19:00:00.000Z"); // 22:00 MSK
    const fireAt = getNightReminderFireAt(kickoff)!;
    expect(getMskCalendarDateKey(fireAt)).toBe("2026-06-11");
    expect(fireAt.getUTCHours()).toBe(15); // 18:00 MSK = 15:00 UTC
  });

  it("02:00 МСК 12 июня → напоминание 18:00 11 июня", () => {
    const kickoff = new Date("2026-06-11T23:00:00.000Z"); // 02:00 MSK 12th
    const fireAt = getNightReminderFireAt(kickoff)!;
    expect(getMskCalendarDateKey(fireAt)).toBe("2026-06-11");
  });

  it("06:00 МСК 12 июня → напоминание 18:00 11 июня", () => {
    const kickoff = new Date("2026-06-12T03:00:00.000Z"); // 06:00 MSK
    const fireAt = getNightReminderFireAt(kickoff)!;
    expect(getMskCalendarDateKey(fireAt)).toBe("2026-06-11");
  });

  it("08:01 МСК — вне ночного окна", () => {
    const kickoff = new Date("2026-06-12T05:01:00.000Z");
    expect(isNightWindowKickoffMsk(kickoff)).toBe(false);
  });
});
