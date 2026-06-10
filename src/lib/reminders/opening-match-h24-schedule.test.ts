import { describe, expect, it } from "vitest";
import {
  getOpeningH24FireAt,
  isOpeningH24Due,
} from "@/lib/reminders/opening-match-h24-schedule";

describe("opening match h24 schedule", () => {
  it("матч 11 июля 22:00 МСК → отправка 10 июля 22:35 МСК", () => {
    const kickoff = new Date("2026-07-11T19:00:00.000Z");
    const fireAt = getOpeningH24FireAt(kickoff);

    expect(fireAt.toISOString()).toBe("2026-07-10T19:35:00.000Z");
    expect(isOpeningH24Due(new Date("2026-07-10T19:35:00.000Z"), kickoff)).toBe(
      true,
    );
    expect(isOpeningH24Due(new Date("2026-07-10T19:34:00.000Z"), kickoff)).toBe(
      false,
    );
  });

  it("догоняет после 22:35, пока матч не начался", () => {
    const kickoff = new Date("2026-07-11T19:00:00.000Z");
    expect(isOpeningH24Due(new Date("2026-07-10T20:00:00.000Z"), kickoff)).toBe(
      true,
    );
  });
});
