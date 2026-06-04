import { getTelegramBotToken, getTelegramChannelId } from "@/lib/telegram/config";

type TelegramApiResult<T> = { ok: true; result: T } | { ok: false; description?: string };

async function callTelegramApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = getTelegramBotToken();
  if (!token) {
    throw new Error("TELEGRAM_NOT_CONFIGURED");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as TelegramApiResult<T>;
  if (!data.ok) {
    throw new Error(data.description ?? `Telegram API ${method} failed`);
  }

  return data.result;
}

export async function sendTelegramMessage(
  chatId: bigint,
  text: string,
): Promise<void> {
  await callTelegramApi("sendMessage", {
    chat_id: chatId.toString(),
    text: text.slice(0, 4096),
    disable_web_page_preview: true,
  });
}

/** Пост в канал (TELEGRAM_CHANNEL_ID). */
export async function sendTelegramChannelMessage(text: string): Promise<void> {
  const channelId = getTelegramChannelId();
  if (!channelId) {
    throw new Error("TELEGRAM_CHANNEL_NOT_CONFIGURED");
  }

  await callTelegramApi("sendMessage", {
    chat_id: channelId,
    text: text.slice(0, 4096),
    disable_web_page_preview: true,
  });
}
