import {
  clearPersistedActiveGameForUser,
  getPersistedActiveGameInvite,
  persistActiveGameForUser,
} from "@/lib/active-game";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export type MembershipEndResult = ActionResult & {
  clearedAllGames?: boolean;
};

/** До выхода/удаления: при 3+ турнирах и текущем — обязателен выбор следующего текущего. */
export async function validateNextActiveBeforeMembershipEnd(
  userId: string,
  removedInviteCode: string,
  membershipCount: number,
  nextActiveInviteCode?: string,
): Promise<MembershipEndResult> {
  const activeInvite = await getPersistedActiveGameInvite(userId);
  const removed = normalizeInviteCodeInput(removedInviteCode);

  if (!activeInvite || activeInvite !== removed) {
    return { success: true };
  }

  const remainingAfter = membershipCount - 1;
  if (remainingAfter <= 1) {
    return { success: true };
  }

  if (!nextActiveInviteCode?.trim()) {
    return { error: "Выберите турнир, который станет текущим." };
  }

  const next = normalizeInviteCodeInput(nextActiveInviteCode);
  const other = await prisma.gameParticipant.findMany({
    where: { userId },
    select: { game: { select: { inviteCode: true } } },
  });

  const allowed = other.some(
    (row) =>
      normalizeInviteCodeInput(row.game.inviteCode) !== removed &&
      normalizeInviteCodeInput(row.game.inviteCode) === next,
  );
  if (!allowed) {
    return { error: "Выбранный турнир недоступен." };
  }

  return { success: true };
}

/** После выхода или удаления: сброс, авто-выбор единственного или установка выбранного текущего. */
export async function applyActiveGameAfterMembershipEnd(
  userId: string,
  removedInviteCode: string,
  nextActiveInviteCode?: string,
): Promise<MembershipEndResult> {
  const activeInvite = await getPersistedActiveGameInvite(userId);
  const removed = normalizeInviteCodeInput(removedInviteCode);

  if (!activeInvite || activeInvite !== removed) {
    return { success: true };
  }

  const remaining = await prisma.gameParticipant.findMany({
    where: { userId },
    select: { game: { select: { inviteCode: true } } },
    orderBy: { joinedAt: "desc" },
  });

  if (remaining.length === 0) {
    await clearPersistedActiveGameForUser(userId);
    return { success: true, clearedAllGames: true };
  }

  if (remaining.length === 1) {
    await persistActiveGameForUser(
      userId,
      remaining[0]!.game.inviteCode,
    );
    return { success: true };
  }

  if (!nextActiveInviteCode?.trim()) {
    return { error: "Выберите турнир, который станет текущим." };
  }

  const next = normalizeInviteCodeInput(nextActiveInviteCode);
  const allowed = remaining.some(
    (row) => normalizeInviteCodeInput(row.game.inviteCode) === next,
  );
  if (!allowed) {
    return { error: "Выбранный турнир недоступен." };
  }

  await persistActiveGameForUser(userId, next);
  return { success: true };
}
