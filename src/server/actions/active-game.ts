"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  resolveActiveGameInviteCode,
  setActiveGameInviteCookie,
} from "@/lib/active-game";
import { findGameByInviteCode } from "@/lib/game-invite";
import { gamePath } from "@/lib/game-path";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export async function setActiveGameAction(
  inviteCodeRaw: string,
  options?: { redirectToGame?: boolean },
): Promise<ActionResult> {
  const session = await requireAuth();
  const inviteCode = normalizeInviteCodeInput(inviteCodeRaw.trim());
  const game = await findGameByInviteCode(inviteCode);

  if (!game) {
    return { error: "Турнир не найден." };
  }

  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId: game.id, userId: session.id } },
    select: { id: true },
  });

  if (!participant) {
    return { error: "Вы не участник этого турнира." };
  }

  await setActiveGameInviteCookie(inviteCode);
  revalidatePath("/", "layout");
  revalidatePath("/");

  if (options?.redirectToGame) {
    redirect(gamePath(inviteCode));
  }

  return { success: true };
}

export async function getActiveGameInviteForUser(
  userId: string,
  fallbackInviteCode?: string,
): Promise<string | undefined> {
  return resolveActiveGameInviteCode(userId, { fallbackInviteCode });
}
