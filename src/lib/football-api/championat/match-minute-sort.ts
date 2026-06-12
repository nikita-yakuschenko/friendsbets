import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";

export type MatchMinuteSortParts = {
  base: number;
  added: number;
};

/** Разбор минуты события: 45' → {45,0}, 45+1' → {45,1}. */
export function parseMatchMinuteSortParts(
  minuteLabel: string,
  fallbackMinute: number | null = null,
): MatchMinuteSortParts {
  const text = minuteLabel.replace(/\u00a0/g, " ").trim();
  const stoppage = text.match(/^(\d+)\s*\+\s*(\d+)/);
  if (stoppage) {
    return {
      base: Number(stoppage[1]),
      added: Number(stoppage[2]),
    };
  }

  const regular = text.match(/^(\d+)/);
  if (regular) {
    return { base: Number(regular[1]), added: 0 };
  }

  if (fallbackMinute != null && Number.isFinite(fallbackMinute)) {
    return { base: Math.floor(fallbackMinute), added: 0 };
  }

  return { base: 9999, added: 0 };
}

export function compareMatchMinuteSortParts(
  a: MatchMinuteSortParts,
  b: MatchMinuteSortParts,
): number {
  if (a.base !== b.base) return a.base - b.base;
  return a.added - b.added;
}

export function compareChampionatMatchEventsByMinute(
  a: Pick<ChampionatMatchEvent, "minuteLabel" | "minute" | "playerName">,
  b: Pick<ChampionatMatchEvent, "minuteLabel" | "minute" | "playerName">,
): number {
  const byMinute = compareMatchMinuteSortParts(
    parseMatchMinuteSortParts(a.minuteLabel, a.minute),
    parseMatchMinuteSortParts(b.minuteLabel, b.minute),
  );
  if (byMinute !== 0) return byMinute;
  return a.playerName.localeCompare(b.playerName, "ru");
}

export function sortChampionatMatchEventsByMinute<
  T extends Pick<ChampionatMatchEvent, "minuteLabel" | "minute" | "playerName">,
>(events: T[]): T[] {
  return [...events].sort(compareChampionatMatchEventsByMinute);
}
