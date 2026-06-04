export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function getTelegramBotUsername(): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  return username || null;
}

export function getTelegramWebhookSecret(): string | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  return secret || null;
}

/** Достаточно токена; username можно не задавать — возьмём из getMe. */
export function isTelegramConfigured(): boolean {
  return Boolean(getTelegramBotToken());
}

let cachedBotUsername: string | null | undefined;

/** Имя бота для ссылки t.me: из TELEGRAM_BOT_USERNAME или getMe API. */
export async function resolveTelegramBotUsername(): Promise<string | null> {
  const fromEnv = getTelegramBotUsername();
  if (fromEnv) return fromEnv;

  const token = getTelegramBotToken();
  if (!token) return null;

  if (cachedBotUsername !== undefined) {
    return cachedBotUsername;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await response.json()) as {
      ok: boolean;
      result?: { username?: string };
    };
    cachedBotUsername = data.ok && data.result?.username
      ? data.result.username
      : null;
  } catch {
    cachedBotUsername = null;
  }

  return cachedBotUsername;
}
