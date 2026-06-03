import { MatchStatus } from "@/generated/prisma/client";
import { championatLivePhaseToMatchStatus } from "@/lib/football-api/championat/championat-phase-to-match-status";
import { parseChampionatLiveStatusFromHtml } from "@/lib/football-api/championat/match-live-status";

/** Статус с карточки матча Championat (`.match-info__status`). */
export function parseChampionatMatchStatusFromHtml(
  html: string,
): MatchStatus | undefined {
  const { phase } = parseChampionatLiveStatusFromHtml(html);
  const fromPhase = championatLivePhaseToMatchStatus(phase);
  if (fromPhase) return fromPhase;

  const match = html.match(
    /<div class="match-info__status">\s*([\s\S]*?)<\/div>/i,
  );
  if (!match) return undefined;

  const text = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (/перенес/i.test(text)) return MatchStatus.POSTPONED;
  if (/отмен/i.test(text)) return MatchStatus.CANCELLED;

  return undefined;
}
