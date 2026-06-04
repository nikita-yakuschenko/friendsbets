export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function getTelegramBotUsername(): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  return username || null;
}

/** Telegram: только A–Z, a–z, 0–9, _, - (1–256 символов). */
const WEBHOOK_SECRET_RE = /^[A-Za-z0-9_-]{1,256}$/;

export function getTelegramWebhookSecret(): string | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return null;
  if (!WEBHOOK_SECRET_RE.test(secret)) {
    console.warn(
      "[telegram] TELEGRAM_WEBHOOK_SECRET: недопустимые символы (нельзя +, =, / …). Используйте буквы, цифры, _ и -. Webhook без secret.",
    );
    return null;
  }
  return secret;
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

/** ID канала: @username или -100… (бот — админ канала). */
export function getTelegramChannelId(): string | null {
  const id = process.env.TELEGRAM_CHANNEL_ID?.trim();
  return id || null;
}

/** Ссылка для подписки (t.me/…), опционально. */
export function getTelegramChannelUrl(): string | null {
  const url = process.env.TELEGRAM_CHANNEL_URL?.trim();
  return url || null;
}

export function isTelegramChannelConfigured(): boolean {
  return Boolean(getTelegramBotToken() && getTelegramChannelId());
}
