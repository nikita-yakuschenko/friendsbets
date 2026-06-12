/** Задержка раскрытия лайва и прогнозов друзей относительно расписания (по умолчанию 3 мин). */
export const DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS = 3 * 60 * 1000;

export function getMatchKickoffRevealDelayMs(): number {
  const raw = process.env.MATCH_KICKOFF_REVEAL_DELAY_MS;
  if (!raw?.trim()) return DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_MATCH_KICKOFF_REVEAL_DELAY_MS;
  }

  return Math.round(parsed);
}

/** Момент раскрытия лайва / чужих прогнозов (расписание + задержка). */
export function getEffectiveKickoffAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() + getMatchKickoffRevealDelayMs());
}

export function isMatchRevealed(
  startsAt: Date,
  now: Date = new Date(),
): boolean {
  return getEffectiveKickoffAt(startsAt).getTime() <= now.getTime();
}
