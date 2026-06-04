import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import {
  isTelegramConfigured,
  resolveTelegramBotUsername,
} from "@/lib/telegram/config";

const LINK_PREFIX = "link_";
const LINK_TTL_MS = 15 * 60 * 1000;

export async function buildTelegramDeepLink(
  token: string,
): Promise<string | null> {
  const username = await resolveTelegramBotUsername();
  if (!username) return null;
  return `https://t.me/${username}?start=${LINK_PREFIX}${token}`;
}

export async function createTelegramLinkForUser(userId: string): Promise<{
  deepLink: string;
  expiresAt: Date;
}> {
  if (!isTelegramConfigured()) {
    throw new Error("TELEGRAM_NOT_CONFIGURED");
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramLinkToken: token,
      telegramLinkExpiresAt: expiresAt,
    },
  });

  const deepLink = await buildTelegramDeepLink(token);
  if (!deepLink) {
    throw new Error("TELEGRAM_BOT_USERNAME_UNAVAILABLE");
  }

  return { deepLink, expiresAt };
}

export function parseTelegramLinkTokenFromStart(text: string): string | null {
  const parts = text.trim().split(/\s+/);
  const payload = parts[1];
  if (!payload?.startsWith(LINK_PREFIX)) return null;
  return payload.slice(LINK_PREFIX.length);
}

export async function completeTelegramLink(
  token: string,
  chatId: bigint,
  username: string | null,
): Promise<{ ok: true; userName: string } | { ok: false; reason: string }> {
  const user = await prisma.user.findFirst({
    where: {
      telegramLinkToken: token,
      telegramLinkExpiresAt: { gt: new Date() },
    },
    select: { id: true, name: true, telegramChatId: true },
  });

  if (!user) {
    return { ok: false, reason: "Ссылка устарела или уже использована. Получите новую в профиле на сайте." };
  }

  const chatTaken = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
      NOT: { id: user.id },
    },
    select: { id: true },
  });

  if (chatTaken) {
    return {
      ok: false,
      reason: "Этот Telegram уже привязан к другому аккаунту FriendsBets.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: chatId,
      telegramUsername: username,
      telegramLinkedAt: new Date(),
      telegramLinkToken: null,
      telegramLinkExpiresAt: null,
    },
  });

  return { ok: true, userName: user.name };
}

export async function unlinkTelegramForUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramChatId: null,
      telegramUsername: null,
      telegramLinkedAt: null,
      telegramLinkToken: null,
      telegramLinkExpiresAt: null,
    },
  });
}
