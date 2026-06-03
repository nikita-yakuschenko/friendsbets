import { MatchStatus } from "@/generated/prisma/client";
import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-status";

/** Только для сервера (API, sync) — не импортировать в client components. */
export function championatLivePhaseToMatchStatus(
  phase: ChampionatLivePhase,
): MatchStatus | undefined {
  if (phase === "finished") return MatchStatus.FINISHED;
  if (
    phase === "live" ||
    phase === "halftime" ||
    phase === "extra_time" ||
    phase === "penalties"
  ) {
    return MatchStatus.LIVE;
  }
  return undefined;
}
