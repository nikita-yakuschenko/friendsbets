"use server";

import { UserNotificationKind } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";
import { isSuperadmin } from "@/lib/roles";
import {
  createTelegramLinkForUser,
  unlinkTelegramForUser,
} from "@/lib/telegram/link";
import type { ActionResult } from "@/server/actions/auth";

export type TelegramLinkStatus = {
  configured: boolean;
  linked: boolean;
  username: string | null;
  linkedAt: string | null;
};

export async function getTelegramLinkStatusForUser(
  userId: string,
): Promise<TelegramLinkStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramUsername: true,
      telegramLinkedAt: true,
    },
  });

  return {
    configured: isTelegramConfigured(),
    linked: user?.telegramChatId != null,
    username: user?.telegramUsername ?? null,
    linkedAt: user?.telegramLinkedAt?.toISOString() ?? null,
  };
}

export async function createTelegramLinkAction(): Promise<
  ActionResult & { deepLink?: string }
> {
  const session = await requireAuth();

  if (!isTelegramConfigured()) {
    return { error: "Telegram-бот не настроен на сервере." };
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.id },
    select: { telegramChatId: true },
  });

  if (existing?.telegramChatId != null) {
    return { error: "Telegram уже привязан. Сначала отвяжите." };
  }

  try {
    const { deepLink } = await createTelegramLinkForUser(session.id);
    revalidatePath("/profile");
    return {
      success: true,
      message: "Откройте ссылку в Telegram и нажмите «Start».",
      deepLink,
    };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "TELEGRAM_BOT_USERNAME_UNAVAILABLE"
    ) {
      return {
        error:
          "Не удалось получить имя бота. Проверьте TELEGRAM_BOT_TOKEN или задайте TELEGRAM_BOT_USERNAME.",
      };
    }
    return { error: "Не удалось создать ссылку для привязки." };
  }
}

export async function sendAdminTelegramMessageAction(
  userId: string,
  messageRaw: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    return { error: "Нет доступа." };
  }

  if (!isTelegramConfigured()) {
    return { error: "Telegram-бот не настроен (TELEGRAM_BOT_TOKEN)." };
  }

  const message = messageRaw.trim();
  if (!message) {
    return { error: "Введите текст сообщения." };
  }
  if (message.length > 4000) {
    return { error: "Сообщение не длиннее 4000 символов." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramUsername: true,
      name: true,
    },
  });

  if (!user) {
    return { error: "Пользователь не найден." };
  }

  if (user.telegramChatId == null) {
    return {
      error: `${user.name} не привязал Telegram. Попросите открыть «Профиль → Привязать Telegram».`,
    };
  }

  try {
    await sendTelegramMessage(user.telegramChatId, message);

    await prisma.userNotification.create({
      data: {
        userId,
        kind: UserNotificationKind.PLATFORM_BROADCAST,
        title: "Сообщение от FriendsBets",
        body: message,
      },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/users/${userId}`);

    const handle = user.telegramUsername ? `@${user.telegramUsername}` : user.name;
    return {
      success: true,
      message: `Отправлено в Telegram (${handle}). Дубликат — в уведомлениях на сайте.`,
    };
  } catch (error) {
    console.error("[telegram:admin-send]", error);
    return { error: "Не удалось отправить сообщение в Telegram." };
  }
}

export async function unlinkTelegramAction(): Promise<ActionResult> {
  const session = await requireAuth();

  await unlinkTelegramForUser(session.id);
  revalidatePath("/profile");

  return { success: true, message: "Telegram отвязан." };
}
