import { cookies } from "next/headers";
import { findGameByInviteCode } from "@/lib/game-invite";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import { prisma } from "@/lib/db";

import {
  ACTIVE_GAME_COOKIE,
  ACTIVE_GAME_COOKIE_MAX_AGE,
} from "@/lib/active-game-cookie";

export { ACTIVE_GAME_COOKIE, ACTIVE_GAME_COOKIE_MAX_AGE };

function normalizeGameRouteParam(routeParam: string): string {
  try {
    return decodeURIComponent(routeParam).trim();
  } catch {
    return routeParam.trim();
  }
}

export async function getActiveGameInviteFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_GAME_COOKIE)?.value?.trim();
  if (!raw) return null;
  return normalizeInviteCodeInput(raw);
}

/** Только Server Action / Route Handler / middleware response. */
export async function setActiveGameInviteCookie(inviteCode: string): Promise<void> {
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

function inviteFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/^\/game\/([^/]+)/);
  if (!match) return undefined;
  return normalizeInviteCodeInput(normalizeGameRouteParam(match[1]));
}

/** Текущий турнир для навигации (только чтение, без записи cookie). */
export async function resolveActiveGameInviteCode(
  userId: string,
  options?: {
    preferredInviteCode?: string;
    pathname?: string;
    fallbackInviteCode?: string;
  },
): Promise<string | undefined> {
  const preferred = options?.preferredInviteCode
    ? normalizeInviteCodeInput(options.preferredInviteCode)
    : undefined;
  const fromPath = options?.pathname
    ? inviteFromPathname(options.pathname)
    : undefined;

  const candidates = [
    preferred,
    fromPath,
    await getActiveGameInviteFromCookie(),
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
