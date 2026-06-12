/** Реалистичный счёт футбольного матча (отсекает мусор парсера и ID в URL). */
export function isPlausibleFootballScore(
  homeScore: number,
  awayScore: number,
): boolean {
  return (
    Number.isFinite(homeScore) &&
    Number.isFinite(awayScore) &&
    homeScore >= 0 &&
    awayScore >= 0 &&
    homeScore <= 20 &&
    awayScore <= 20
  );
}

/** Время начала матча (22:00 → 22 и 0), а не счёт. */
export function isLikelyKickoffTime(
  homeScore: number,
  awayScore: number,
): boolean {
  return homeScore >= 11 && homeScore <= 23 && awayScore === 0;
}

export function parsePlausibleFootballScore(
  homeScore: number,
  awayScore: number,
): { homeScore: number; awayScore: number } | null {
  if (
    !isPlausibleFootballScore(homeScore, awayScore) ||
    isLikelyKickoffTime(homeScore, awayScore)
  ) {
    return null;
  }
  return { homeScore, awayScore };
}

export function hasImplausibleStoredScore(
  homeScore: number | null,
  awayScore: number | null,
): boolean {
  if (homeScore === null || awayScore === null) return false;
  return !isPlausibleFootballScore(homeScore, awayScore);
}

/** Не показываем мусор парсера (22:0) — на табло будет 0:0. */
export function sanitizeStoredScore(
  homeScore: number | null,
  awayScore: number | null,
): { homeScore: number | null; awayScore: number | null } {
  if (hasImplausibleStoredScore(homeScore, awayScore)) {
    return { homeScore: null, awayScore: null };
  }
  return { homeScore, awayScore };
}
