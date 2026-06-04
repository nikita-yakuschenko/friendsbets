import { absoluteAppUrl } from "@/lib/app-origin";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";

function logTelegramError(context: string, error: unknown) {
  console.error(`[telegram:${context}]`, error);
}

/** Персональное уведомление в Telegram (не блокирует основной поток). */
export function pushTelegramToUser(
  userId: string,
  text: string,
  appPath = "/notifications",
): void {
  if (!isTelegramConfigured()) return;

  void (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true },
      });
      if (!user?.telegramChatId) return;

      const url = absoluteAppUrl(appPath);
      await sendTelegramMessage(
        user.telegramChatId,
        `${text}\n\n${url}`,
      );
    } catch (error) {
      logTelegramError(`push:${userId}`, error);
    }
  })();
}

export function pushTelegramToUsers(
  userIds: string[],
  text: string,
  appPath = "/notifications",
): void {
  for (const userId of userIds) {
    pushTelegramToUser(userId, text, appPath);
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

      const url = absoluteAppUrl("/notifications");
      const message = `${title}\n\n${body}\n\n${url}`;

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
