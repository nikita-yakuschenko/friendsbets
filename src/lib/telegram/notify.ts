import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";

function logTelegramError(context: string, error: unknown) {
  console.error(`[telegram:${context}]`, error);
}

/** Персональное уведомление в Telegram (не блокирует основной поток). */
export function pushTelegramToUser(userId: string, text: string): void {
  if (!isTelegramConfigured()) return;

  void (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true },
      });
      if (!user?.telegramChatId) return;

      await sendTelegramMessage(
        user.telegramChatId,
        appendTelegramChannelFooter(text),
      );
    } catch (error) {
      logTelegramError(`push:${userId}`, error);
    }
  })();
}

export function pushTelegramToUsers(userIds: string[], text: string): void {
  for (const userId of userIds) {
    pushTelegramToUser(userId, text);
  }
}

export function pushTelegramBroadcast(title: string, body: string): void {
  if (!isTelegramConfigured()) return;

  void (async () => {
    try {
      const users = await prisma.user.findMany({
        where: { telegramChatId: { not: null } },
        select: { telegramChatId: true },
      });

      const message = appendTelegramChannelFooter(`${title}\n\n${body}`);

      for (const user of users) {
        if (!user.telegramChatId) continue;
        try {
          await sendTelegramMessage(user.telegramChatId, message);
        } catch (error) {
          logTelegramError("broadcast:one", error);
        }
      }
    } catch (error) {
      logTelegramError("broadcast", error);
    }
  })();
}
