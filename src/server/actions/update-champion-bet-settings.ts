"use server";

import { revalidatePath } from "next/cache";
import { gamePath } from "@/lib/game-path";
import { isGameOrganizer } from "@/lib/game-access";
import { getFirstPlayoffMatchStart, isPlayoffStarted } from "@/lib/champion-bet";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/auth";

export async function updateChampionBetSettingsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const gameId = String(formData.get("gameId") ?? "");
  const enabled = formData.get("championBetEnabled") === "on";
  const pointsRaw = String(formData.get("championBetPoints") ?? "").trim();
  const points = pointsRaw === "" ? null : Number(pointsRaw);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, inviteCode: true, tournamentId: true },
  });
  if (!game) return { error: "Турнир не найден." };

  if (!(await isGameOrganizer(session.id, gameId))) {
    return { error: "Настройки может менять только организатор турнира." };
  }

  const firstPlayoff = await getFirstPlayoffMatchStart(game.tournamentId);
  if (isPlayoffStarted(firstPlayoff)) {
    return {
      error: "Плей-офф уже начался — ставку на чемпиона изменить нельзя.",
    };
  }

  if (enabled && (points == null || Number.isNaN(points) || points < 1)) {
    return { error: "Укажите количество очков за угаданного чемпиона (от 1)." };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: {
      championBetEnabled: enabled,
      championBetPoints: enabled ? points : null,
    },
  });

  revalidatePath(gamePath(game.inviteCode));
  revalidatePath(gamePath(game.inviteCode, "champion-bet"));
  revalidatePath(gamePath(game.inviteCode, "predictions"));

  return {
    success: true,
    message: enabled
      ? `Ставка на чемпиона включена (${points} очк.)`
      : "Ставка на чемпиона выключена",
  };
}
