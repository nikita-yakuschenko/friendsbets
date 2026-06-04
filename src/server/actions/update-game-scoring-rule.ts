"use server";

import { revalidatePath } from "next/cache";
import { gamePath } from "@/lib/game-path";
import { isGameTournamentStarted } from "@/lib/game-tournament-started";
import { isGameOrganizer } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/auth";

export async function updateGameScoringRuleAction(
  gameId: string,
  scoringRuleId: string,
): Promise<ActionResult> {
  const session = await requireAuth();

  if (!scoringRuleId.trim()) {
    return { error: "Выберите систему начисления очков." };
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, inviteCode: true },
  });
  if (!game) {
    return { error: "Турнир не найден." };
  }

  const organizer = await isGameOrganizer(session.id, gameId);
  if (!organizer) {
    return { error: "Менять правила может только организатор турнира." };
  }

  if (await isGameTournamentStarted(gameId)) {
    return {
      error: "Турнир уже начался — систему начисления очков изменить нельзя.",
    };
  }

  const scoringRule = await prisma.scoringRule.findUnique({
    where: { id: scoringRuleId },
    select: { id: true, title: true },
  });
  if (!scoringRule) {
    return { error: "Система начисления очков не найдена." };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { scoringRuleId: scoringRule.id },
  });

  revalidatePath("/");
  revalidatePath(gamePath(game.inviteCode));
  revalidatePath(gamePath(game.inviteCode, "leaderboard"));

  return {
    success: true,
    message: `Правила очков: «${scoringRule.title}»`,
  };
}
