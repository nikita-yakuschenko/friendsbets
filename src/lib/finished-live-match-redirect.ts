import { MatchStatus } from "@/generated/prisma/client";
import { requireGameViewByRoute } from "@/lib/game-access";
import { gamePath } from "@/lib/game-path";
import { isMatchStaleAwaitingResult } from "@/lib/match-prediction-state";
import { prisma } from "@/lib/db";

export function buildFinishedMatchPredictionsUrl(
  inviteCode: string,
  matchId: string,
  options?: { platformView?: boolean },
): string {
  const params = new URLSearchParams({ view: "finished" });
  if (options?.platformView) params.set("as", "platform");
  return `${gamePath(inviteCode, "predictions")}?${params.toString()}#match-${matchId}`;
}

/** Если матч уже не в лайве, но завершён — URL карточки в «Прогнозах». */
export async function resolveFinishedLiveMatchRedirect(
  routeParam: string,
  matchId: string,
  platformView = false,
): Promise<string | null> {
  const view = await requireGameViewByRoute(routeParam, platformView);
  if (!view) return null;

  const game = await prisma.game.findUnique({
    where: { id: view.gameId },
    select: { inviteCode: true, tournamentId: true },
  });
  if (!game) return null;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      tournamentId: true,
      status: true,
      startsAt: true,
      homeScore: true,
      awayScore: true,
    },
  });
  if (!match || match.tournamentId !== game.tournamentId) return null;

  const finished =
    match.status === MatchStatus.FINISHED ||
    isMatchStaleAwaitingResult(match);
  if (!finished) return null;

  return buildFinishedMatchPredictionsUrl(game.inviteCode, matchId, {
    platformView,
  });
}
