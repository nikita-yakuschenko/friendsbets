"use server";

import { revalidatePath } from "next/cache";
import { gamePath } from "@/lib/game-path";
import { isGameOrganizer } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getPenaltyScoringModeLabel } from "@/lib/scoring/penalty-scoring-mode";
import { recalculateAllGamePredictionScores } from "@/lib/scoring/recalculate-match-scores";
import type { ActionResult } from "@/server/actions/auth";

export async function updatePenaltyScoringModeAction(
  gameId: string,
  penaltyScoringSynthetic: boolean,
): Promise<ActionResult & { recalculatedMatches?: number }> {
  const session = await requireAuth();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      inviteCode: true,
      penaltyScoringSynthetic: true,
    },
  });
  if (!game) return { error: "Турнир не найден." };

  if (!(await isGameOrganizer(session.id, gameId))) {
    return { error: "Настройку может менять только организатор турнира." };
  }

  if (game.penaltyScoringSynthetic === penaltyScoringSynthetic) {
    return {
      success: true,
      message: `Уже выбрано: ${getPenaltyScoringModeLabel(penaltyScoringSynthetic)}`,
    };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { penaltyScoringSynthetic },
  });

  const recalculatedMatches = await recalculateAllGamePredictionScores(gameId);

  revalidatePath("/");
  revalidatePath(gamePath(game.inviteCode));
  revalidatePath(gamePath(game.inviteCode, "leaderboard"));
  revalidatePath(gamePath(game.inviteCode, "predictions"));

  return {
    success: true,
    message: `Метод пенальти: ${getPenaltyScoringModeLabel(penaltyScoringSynthetic)}. Пересчитано матчей: ${recalculatedMatches}.`,
    recalculatedMatches,
  };
}
