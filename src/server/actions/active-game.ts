"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  persistActiveGameForUser,
  resolveActiveGameInviteCode,
} from "@/lib/active-game";
import { gamePath } from "@/lib/game-path";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import type { ActionResult } from "@/server/actions/auth";

export async function setActiveGameAction(
  inviteCodeRaw: string,
  options?: { redirectToGame?: boolean },
): Promise<ActionResult> {
  const session = await requireAuth();
  const inviteCode = normalizeInviteCodeInput(inviteCodeRaw.trim());

  try {
    await persistActiveGameForUser(session.id, inviteCode);
  } catch (error) {
    if (error instanceof Error && error.message === "ACTIVE_GAME_NOT_FOUND") {
      return { error: "Турнир не найден." };
    }
    if (error instanceof Error && error.message === "ACTIVE_GAME_FORBIDDEN") {
      return { error: "Вы не участник этого турнира." };
    }
    throw error;
  }
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
