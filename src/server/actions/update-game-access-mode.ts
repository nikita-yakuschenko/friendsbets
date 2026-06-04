"use server";

import { GameAccessMode } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { gamePath } from "@/lib/game-path";
import {
  GAME_ACCESS_MODE,
  parseGameAccessModeInput,
  type GameAccessModeValue,
} from "@/lib/game-access-mode";
import { isGameTournamentStarted } from "@/lib/game-tournament-started";
import { isGameOrganizer } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/auth";

export async function updateGameAccessModeAction(
  gameId: string,
  accessModeRaw: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const accessMode: GameAccessModeValue =
    parseGameAccessModeInput(accessModeRaw);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, inviteCode: true },
  });
  if (!game) {
    return { error: "Турнир не найден." };
  }

  if (!(await isGameOrganizer(session.id, gameId))) {
    return { error: "Менять доступ может только организатор турнира." };
  }

  if (await isGameTournamentStarted(gameId)) {
    return {
      error: "Турнир уже начался — режим доступа изменить нельзя.",
    };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: {
      accessMode:
        accessMode === GAME_ACCESS_MODE.REQUEST
          ? GameAccessMode.REQUEST
          : GameAccessMode.OPEN,
    },
  });

  revalidatePath("/");
  revalidatePath(gamePath(game.inviteCode));
  revalidatePath(gamePath(game.inviteCode, "more/notifications"));

  const label =
    accessMode === GAME_ACCESS_MODE.REQUEST ? "По заявке" : "Свободный";

  return {
    success: true,
    message: `Доступ: ${label}`,
  };
}
