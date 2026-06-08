"use server";

import { redirect } from "next/navigation";
import {
  GameAccessMode,
  GameParticipantRole,
} from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { setActiveGameInviteCookie } from "@/lib/active-game";
import { findGameByInviteCode } from "@/lib/game-invite";
import { gamePath } from "@/lib/game-path";
import { revalidateGamePaths } from "@/lib/game-access";
import {
  resolveGameJoinPreview,
  type GameJoinPreview,
} from "@/lib/join-game-preview";
import {
  normalizeInviteCodeInput,
  validateInviteCodeFormat,
} from "@/lib/invite-code";
import { prisma } from "@/lib/db";
import { notifyOpeningMatchOnTournamentJoin } from "@/lib/tournament-opening-reminder";
import type { ActionResult } from "@/server/actions/auth";

export type LookupGameResult = ActionResult & {
  preview?: GameJoinPreview;
};

export async function lookupGameByInviteAction(
  _prev: LookupGameResult | undefined,
  formData: FormData,
): Promise<LookupGameResult> {
  const session = await requireAuth();
  const inviteCodeRaw = String(formData.get("inviteCode") ?? "");

  const result = await resolveGameJoinPreview(session.id, inviteCodeRaw);
  if ("error" in result) {
    return { error: result.error };
  }

  return { success: true, preview: result.preview };
}

export async function confirmJoinGameAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const inviteCodeRaw = String(formData.get("inviteCode") ?? "").trim();

  if (!inviteCodeRaw) {
    return { error: "Код турнира не указан. Найдите турнир заново." };
  }

  const formatError = validateInviteCodeFormat(inviteCodeRaw);
  if (formatError) return { error: formatError };

  const inviteCode = normalizeInviteCodeInput(inviteCodeRaw);
  const game = await findGameByInviteCode(inviteCode);

  if (!game) {
    return { error: "Турнир не найден. Возможно, код изменился — найдите турнир снова." };
  }

  const gameAccess = await prisma.game.findUnique({
    where: { id: game.id },
    select: { accessMode: true },
  });

  if (gameAccess?.accessMode === GameAccessMode.REQUEST) {
    return {
      error:
        "В этот турнир вступают по заявке. Отправьте заявку на вступление.",
    };
  }

  const existing = await prisma.gameParticipant.findUnique({
    where: {
      gameId_userId: { gameId: game.id, userId: session.id },
    },
  });

  if (existing) {
    await setActiveGameInviteCookie(game.inviteCode);
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

  await notifyOpeningMatchOnTournamentJoin(session.id, game.id);

  await setActiveGameInviteCookie(game.inviteCode);
  await revalidateGamePaths(game.id);
  redirect(gamePath(game.inviteCode));
}

/** Для SSR на /join?invite=… */
export async function getGameJoinPreviewForUser(
  userId: string,
  inviteCodeRaw: string,
): Promise<GameJoinPreview | null> {
  const result = await resolveGameJoinPreview(userId, inviteCodeRaw);
  return "preview" in result ? result.preview : null;
}
