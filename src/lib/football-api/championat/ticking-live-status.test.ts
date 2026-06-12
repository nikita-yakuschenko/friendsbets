import { describe, expect, it } from "vitest";
import { applyLiveMinuteTick } from "@/lib/football-api/championat/ticking-live-status";

describe("applyLiveMinuteTick", () => {
  it("добавляет минуты после якоря синка", () => {
    const anchor = Date.parse("2026-06-12T20:00:00Z");
    const now = anchor + 90_000;

    const result = applyLiveMinuteTick(
      {
        phase: "live",
        period: "second_half",
        minute: 64,
        rawText: "2-й тайм, 64'",
      },
      anchor,
      now,
    );

    expect(result.minute).toBe(65);
  });

  it("не тикает на перерыве", () => {
    const status = {
      phase: "halftime" as const,
      rawText: "Перерыв",
    };
    expect(
      applyLiveMinuteTick(status, Date.now() - 120_000, Date.now()).phase,
    ).toBe("halftime");
  });

  it("ограничивает 1-й тайм 45-й минутой", () => {
    const anchor = Date.parse("2026-06-12T20:00:00Z");
    const result = applyLiveMinuteTick(
      {
        phase: "live",
        period: "first_half",
        minute: 44,
        rawText: "1-й тайм, 44'",
      },
      anchor,
      anchor + 180_000,
    );

    expect(result.minute).toBe(45);
  });
});
