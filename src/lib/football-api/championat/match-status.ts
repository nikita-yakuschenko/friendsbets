import { MatchStatus } from "@/generated/prisma/client";

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Статус с карточки матча Championat (`.match-info__status`). */
export function parseChampionatMatchStatusFromHtml(
  html: string,
): MatchStatus | undefined {
  const match = html.match(
    /<div class="match-info__status">\s*([\s\S]*?)<\/div>/i,
  );
  if (!match) return undefined;

  const text = normalizeWhitespace(match[1].replace(/<[^>]+>/g, ""));
  if (!text) return undefined;

  if (/перенес/i.test(text)) return MatchStatus.POSTPONED;
  if (/отмен/i.test(text)) return MatchStatus.CANCELLED;
  if (/идёт|идет|в эфире/i.test(text)) return MatchStatus.LIVE;
  if (/заверш|окончен/i.test(text)) return MatchStatus.FINISHED;

  return undefined;
}
