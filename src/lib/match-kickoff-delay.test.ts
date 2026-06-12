import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS,
  getEffectiveKickoffAt,
  getMatchKickoffRevealDelayMs,
  isMatchRevealed,
} from "@/lib/match-kickoff-delay";

describe("match kickoff reveal delay", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("по умолчанию 3 минуты", () => {
    expect(getMatchKickoffRevealDelayMs()).toBe(
      DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS,
    );
  });

  it("читает MATCH_KICKOFF_REVEAL_DELAY_MS из env", () => {
    vi.stubEnv("MATCH_KICKOFF_REVEAL_DELAY_MS", "120000");
    expect(getMatchKickoffRevealDelayMs()).toBe(120_000);
  });

  it("раскрывает после effective kickoff", () => {
    const startsAt = new Date("2026-06-10T20:00:00.000Z");
    const before = new Date("2026-06-10T20:02:59.000Z");
    const after = new Date("2026-06-10T20:03:00.000Z");

    expect(isMatchRevealed(startsAt, before)).toBe(false);
    expect(isMatchRevealed(startsAt, after)).toBe(true);
    expect(getEffectiveKickoffAt(startsAt).getTime()).toBe(
      startsAt.getTime() + DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS,
    );
  });
});
