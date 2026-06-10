/** Для идущего матча неизвестный счёт в БД = 0:0 на табло. */
export function liveScoreForDisplay(score: number | null | undefined): number {
  return score ?? 0;
}

export function formatLiveScoreLine(
  home: number | null | undefined,
  away: number | null | undefined,
): { home: number; away: number; text: string } {
  const h = liveScoreForDisplay(home);
  const a = liveScoreForDisplay(away);
  return { home: h, away: a, text: `${h} : ${a}` };
}
