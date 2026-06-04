import { sendTelegramChannelMessage } from "@/lib/telegram/api";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { isTelegramChannelConfigured } from "@/lib/telegram/config";

function logChannelError(context: string, error: unknown) {
  console.error(`[telegram:channel:${context}]`, error);
}

/** Пост в новостной канал (не блокирует основной поток). */
export function postTelegramChannelNews(text: string): void {
  if (!isTelegramChannelConfigured()) return;

  void (async () => {
    try {
      await sendTelegramChannelMessage(appendTelegramChannelFooter(text));
    } catch (error) {
      logChannelError("post", error);
    }
  })();
}
