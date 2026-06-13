import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@/generated/prisma/client";
import {
  isMatchInProgress,
  isMatchLockedForPredictions,
  isMatchPostponed,
  isMatchStaleAwaitingResult,
  MATCH_LIVE_TRACKING_MAX_MS,
} from "@/lib/match-prediction-state";

const kickoffSoon = new Date("2026-06-10T18:00:00Z");
const kickoffPast = new Date("2026-06-01T10:00:00Z");

describe("match prediction state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("определяет перенос", () => {
    expect(
      isMatchPostponed({ status: MatchStatus.POSTPONED, startsAt: kickoffPast, homeScore: null, awayScore: null }),
    ).toBe(true);
  });

  it("не блокирует прогноз на перенесённом матче", () => {
    expect(
      isMatchLockedForPredictions({
        status: MatchStatus.POSTPONED,
        startsAt: kickoffPast,
        homeScore: null,
        awayScore: null,
      }),
    ).toBe(false);
  });

  it("блокирует после старта scheduled", () => {
    expect(
      isMatchLockedForPredictions({
        status: MatchStatus.SCHEDULED,
        startsAt: kickoffPast,
        homeScore: null,
        awayScore: null,
      }),
    ).toBe(true);
  });

  it("не блокирует будущий матч", () => {
    expect(
      isMatchLockedForPredictions({
        status: MatchStatus.SCHEDULED,
        startsAt: kickoffSoon,
        homeScore: null,
        awayScore: null,
      }),
    ).toBe(false);
  });

  it("блокирует LIVE в окне отслеживания", () => {
    vi.setSystemTime(new Date(kickoffPast.getTime() + 30 * 60 * 1000));
    expect(
      isMatchLockedForPredictions({
        status: MatchStatus.LIVE,
        startsAt: kickoffPast,
        homeScore: 1,
        awayScore: 0,
      }),
    ).toBe(true);
  });

  it("блокирует прогноз после старта scheduled, но лайв ещё не раскрыт", () => {
    const kickoff = new Date("2026-06-01T12:00:00Z");
    vi.setSystemTime(new Date("2026-06-01T12:01:00Z"));
    const match = {
      status: MatchStatus.SCHEDULED,
      startsAt: kickoff,
      homeScore: null,
      awayScore: null,
    };
    expect(isMatchLockedForPredictions(match)).toBe(true);
    expect(isMatchInProgress(match)).toBe(false);
  });

  it("считает идущий LIVE в окне отслеживания", () => {
    vi.setSystemTime(new Date(kickoffPast.getTime() + 30 * 60 * 1000));
    expect(
      isMatchInProgress({
        status: MatchStatus.LIVE,
        startsAt: kickoffPast,
        homeScore: 1,
        awayScore: 0,
      }),
    ).toBe(true);
  });

  it("считает идущим SCHEDULED после effective kickoff в окне", () => {
    const kickoff = new Date("2026-06-01T10:00:00Z");
    vi.setSystemTime(new Date(kickoff.getTime() + 45 * 60 * 1000));
    expect(
      isMatchInProgress({
        status: MatchStatus.SCHEDULED,
        startsAt: kickoff,
        homeScore: null,
        awayScore: null,
      }),
    ).toBe(true);
  });

  it("не считает идущим LIVE до effective kickoff", () => {
    const kickoff = new Date("2026-06-01T12:00:00Z");
    vi.setSystemTime(new Date("2026-06-01T12:01:00Z"));
    expect(
      isMatchInProgress({
        status: MatchStatus.LIVE,
        startsAt: kickoff,
        homeScore: 1,
        awayScore: 0,
      }),
    ).toBe(false);
  });

  it("считает идущим LIVE после effective kickoff", () => {
    const kickoff = new Date("2026-06-01T12:00:00Z");
    vi.setSystemTime(new Date("2026-06-01T12:04:00Z"));
    expect(
      isMatchInProgress({
        status: MatchStatus.LIVE,
        startsAt: kickoff,
        homeScore: 1,
        awayScore: 0,
      }),
    ).toBe(true);
  });

  it("не считает идущим LIVE с kickoff в будущем", () => {
    expect(
      isMatchInProgress({
        status: MatchStatus.LIVE,
        startsAt: kickoffSoon,
        homeScore: null,
        awayScore: null,
      }),
    ).toBe(false);
  });

  it("помечает зависший матч без FINISHED", () => {
    vi.setSystemTime(new Date(kickoffPast.getTime() + MATCH_LIVE_TRACKING_MAX_MS + 60_000));
    expect(
      isMatchStaleAwaitingResult({
        status: MatchStatus.LIVE,
        startsAt: kickoffPast,
        homeScore: 1,
        awayScore: 0,
      }),
    ).toBe(true);
  });
});
