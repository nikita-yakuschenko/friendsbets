import { cookies } from "next/headers";
import { findGameByInviteCode } from "@/lib/game-invite";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import { prisma } from "@/lib/db";

import {
  ACTIVE_GAME_COOKIE,
  ACTIVE_GAME_COOKIE_MAX_AGE,
} from "@/lib/active-game-cookie";

export { ACTIVE_GAME_COOKIE, ACTIVE_GAME_COOKIE_MAX_AGE };

export async function getActiveGameInviteFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_GAME_COOKIE)?.value?.trim();
  if (!raw) return null;
  return normalizeInviteCodeInput(raw);
}

async function writeActiveGameCookie(inviteCode: string): Promise<void> {
  const normalized = normalizeInviteCodeInput(inviteCode);
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GAME_COOKIE, normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_GAME_COOKIE_MAX_AGE,
    path: "/",
  });
}

/** @deprecated Используйте persistActiveGameForUser */
export async function setActiveGameInviteCookie(inviteCode: string): Promise<void> {
  await writeActiveGameCookie(inviteCode);
}

export async function clearActiveGameInviteCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_GAME_COOKIE);
}

async function userIsGameMember(
  userId: string,
  inviteCode: string,
): Promise<boolean> {
  const game = await findGameByInviteCode(inviteCode);
  if (!game) return false;
  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId: game.id, userId } },
    select: { id: true },
  });
  return Boolean(participant);
}

async function clearPersistedActiveGame(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { activeGameId: null },
  });
  await clearActiveGameInviteCookie();
}

/** Сохранённый пользователем текущий турнир (БД; cookie — зеркало для SSR). */
export async function getPersistedActiveGameInvite(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeGame: { select: { id: true, inviteCode: true } },
    },
  });

  if (user?.activeGame) {
    const member = await prisma.gameParticipant.findUnique({
      where: {
        gameId_userId: { gameId: user.activeGame.id, userId },
      },
      select: { id: true },
    });
    if (member) {
      return normalizeInviteCodeInput(user.activeGame.inviteCode);
    }
    await clearPersistedActiveGame(userId);
  }

  const fromCookie = await getActiveGameInviteFromCookie();
  if (fromCookie && (await userIsGameMember(userId, fromCookie))) {
    const game = await findGameByInviteCode(fromCookie);
    if (game) {
      await prisma.user.update({
        where: { id: userId },
        data: { activeGameId: game.id },
      });
      return fromCookie;
    }
  }

  return null;
}

/** Явный выбор текущего турнира — в БД и cookie. */
export async function persistActiveGameForUser(
  userId: string,
  inviteCode: string,
): Promise<void> {
  const normalized = normalizeInviteCodeInput(inviteCode);
  const game = await findGameByInviteCode(normalized);
  if (!game) {
    throw new Error("ACTIVE_GAME_NOT_FOUND");
  }

  const participant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId: game.id, userId } },
    select: { id: true },
  });
  if (!participant) {
    throw new Error("ACTIVE_GAME_FORBIDDEN");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeGameId: game.id },
  });
  await writeActiveGameCookie(normalized);
}

export async function clearPersistedActiveGameForUser(
  userId: string,
): Promise<void> {
  await clearPersistedActiveGame(userId);
}

/**
 * Invite для навигации:
 * - на странице турнира — открытый турнир (preferred);
 * - иначе — сохранённый пользователем текущий;
 * - иначе — fallback (первый в списке).
 */
export async function resolveActiveGameInviteCode(
  userId: string,
  options?: {
    preferredInviteCode?: string;
    fallbackInviteCode?: string;
  },
): Promise<string | undefined> {
  const preferred = options?.preferredInviteCode
    ? normalizeInviteCodeInput(options.preferredInviteCode)
    : undefined;

  const candidates = [
    preferred,
    await getPersistedActiveGameInvite(userId),
    options?.fallbackInviteCode,
  ]
    .filter((code): code is string => Boolean(code))
    .map((code) => normalizeInviteCodeInput(code));

  const seen = new Set<string>();
  for (const code of candidates) {
    if (seen.has(code)) continue;
    seen.add(code);
    if (await userIsGameMember(userId, code)) {
      return code;
    }
  }

  return undefined;
}
