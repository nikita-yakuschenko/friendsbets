import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram/api";
import {
  completeTelegramLink,
  parseTelegramLinkTokenFromStart,
  unlinkTelegramForUser,
} from "@/lib/telegram/link";
import { isTelegramConfigured } from "@/lib/telegram/config";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
};

type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (!isTelegramConfigured()) return;

  const message = update.message;
  if (!message?.text || !message.from) return;

  const chatId = BigInt(message.chat.id);
  const text = message.text.trim();

  if (text === "/help" || text === "/start") {
    await sendTelegramMessage(
      chatId,
      "Привязка к FriendsBets:\n1. Откройте профиль на сайте\n2. Нажмите «Привязать Telegram»\n3. Откройте выданную ссылку в Telegram\n\nКоманда /unlink — отвязать этот чат.",
    );
    return;
  }

  if (text === "/unlink") {
    const linked = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
      select: { id: true },
    });
    if (!linked) {
      await sendTelegramMessage(chatId, "Этот чат не привязан к FriendsBets.");
      return;
    }
    await unlinkTelegramForUser(linked.id);
    await sendTelegramMessage(chatId, "Telegram отвязан от FriendsBets. Уведомления в боте больше не придут.");
    return;
  }

  const token = parseTelegramLinkTokenFromStart(text);
  if (!token) {
    if (text.startsWith("/start")) {
      await sendTelegramMessage(
        chatId,
        "Чтобы привязать аккаунт, получите персональную ссылку в разделе «Профиль» на сайте FriendsBets.",
      );
    }
    return;
  }

  const result = await completeTelegramLink(
    token,
    chatId,
    message.from.username ?? null,
  );

  if (result.ok) {
    await sendTelegramMessage(
      chatId,
      `Готово! Telegram привязан к профилю «${result.userName}». Уведомления FriendsBets будут приходить сюда.`,
    );
    return;
  }

  await sendTelegramMessage(chatId, result.reason);
}
