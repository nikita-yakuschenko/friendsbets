/** Итоговый счёт с страницы завершённого матча Championat. */
export function parseChampionatFinalScoreFromHtml(
  html: string,
): { homeScore: number; awayScore: number } | null {
  const titleMatch = html.match(/итоговый\s+сч[её]т\s+(\d+)\s*:\s*(\d+)/i);
  if (titleMatch) {
    return {
      homeScore: Number(titleMatch[1]),
      awayScore: Number(titleMatch[2]),
    };
  }

  const countMain = html.match(
    /class="[^"]*stat-results__count-main[^"]*"[^>]*>\s*(\d+)\s*:\s*(\d+)/i,
  );
  if (countMain) {
    return {
      homeScore: Number(countMain[1]),
      awayScore: Number(countMain[2]),
    };
  }

  return null;
}
