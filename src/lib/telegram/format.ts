import { getTelegramChannelUrl } from "@/lib/telegram/config";

/** Опциональный призыв подписаться на канал в конце сообщения. */
export function appendTelegramChannelFooter(text: string): string {
  const url = getTelegramChannelUrl();
  if (!url) return text;
  return `${text}\n\nПодписывайтесь на наш канал:\n${url}`;
}
