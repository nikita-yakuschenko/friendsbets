"use server";

import { redirect } from "next/navigation";
import { GameParticipantRole } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { findGameByInviteCode } from "@/lib/game-invite";
import { validateInviteCodeFormat, normalizeInviteCodeInput } from "@/lib/invite-code";
import { gamePath } from "@/lib/game-path";
import { revalidateGamePaths } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export async function joinGameAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const inviteCodeRaw = String(formData.get("inviteCode") ?? "").trim();

  if (!inviteCodeRaw) {
    return { error: "Введите invite-код." };
  }

  const formatError = validateInviteCodeFormat(inviteCodeRaw);
  if (formatError) return { error: formatError };

  const inviteCode = normalizeInviteCodeInput(inviteCodeRaw);
  const game = await findGameByInviteCode(inviteCode);

  if (!game) {
    return { error: "Турнир с таким invite-кодом не найден." };
  }

  const existing = await prisma.gameParticipant.findUnique({
    where: {
      gameId_userId: { gameId: game.id, userId: session.id },
    },
  });

  if (existing) {
    redirect(gamePath(game.inviteCode));
  }

  await prisma.gameParticipant.create({
    data: {
      gameId: game.id,
      userId: session.id,
      displayName: session.name,
      role: GameParticipantRole.PARTICIPANT,
    },
  });

  await revalidateGamePaths(game.id);
  redirect(gamePath(game.inviteCode));
}
