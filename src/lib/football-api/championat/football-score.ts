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
  return parsePlausibleFootballScore(homeScore, awayScore) === null;
}

/** В БД счёт храним только для идущего LIVE (после kickoff) или FINISHED. */
export function scoresAllowedInMatchDb(
  status: string,
  startsAt: Date,
  now: Date = new Date(),
): boolean {
  if (status === "FINISHED") return true;
  if (status === "LIVE" && startsAt.getTime() <= now.getTime()) return true;
  return false;
}

export function normalizeMatchScoresForDb(
  status: string,
  startsAt: Date,
  homeScore: number | null | undefined,
  awayScore: number | null | undefined,
  now: Date = new Date(),
): { homeScore: number | null; awayScore: number | null } {
  if (!scoresAllowedInMatchDb(status, startsAt, now)) {
    return { homeScore: null, awayScore: null };
  }
  if (
    homeScore === null ||
    homeScore === undefined ||
    awayScore === null ||
    awayScore === undefined
  ) {
    return { homeScore: null, awayScore: null };
  }
  return parsePlausibleFootballScore(homeScore, awayScore) ?? {
    homeScore: null,
    awayScore: null,
  };
}

/** Не показываем мусор парсера и счёт до старта / у SCHEDULED. */
export function sanitizeStoredScore(
  homeScore: number | null,
  awayScore: number | null,
  options?: { status?: string; startsAt?: Date; now?: Date },
): { homeScore: number | null; awayScore: number | null } {
  if (options?.status && options.startsAt) {
    return normalizeMatchScoresForDb(
      options.status,
      options.startsAt,
      homeScore,
      awayScore,
      options.now,
    );
  }
  if (hasImplausibleStoredScore(homeScore, awayScore)) {
    return { homeScore: null, awayScore: null };
  }
  return { homeScore, awayScore };
}
