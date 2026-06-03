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
