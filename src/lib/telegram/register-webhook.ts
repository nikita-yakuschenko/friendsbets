import {
  getTelegramBotToken,
  getTelegramWebhookSecret,
} from "@/lib/telegram/config";

type WebhookInfo = {
  ok: boolean;
  result?: {
    url?: string;
    last_error_message?: string;
    pending_update_count?: number;
  };
};

async function callBotApi<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = getTelegramBotToken();
  if (!token) {
    throw new Error("TELEGRAM_NOT_CONFIGURED");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(data.description ?? `Telegram ${method} failed`);
  }

  return data.result as T;
}

function resolveWebhookTargetUrl(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return null;

  let base: URL;
  try {
    base = new URL(appUrl);
  } catch {
    return null;
  }

  const host = base.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return null;
  }

  if (base.protocol !== "https:") {
    console.warn(
      "[telegram:webhook] NEXT_PUBLIC_APP_URL должен быть https для webhook, пропускаем:",
      appUrl,
    );
    return null;
  }

  return `${base.origin}/api/telegram/webhook`;
}

/** Регистрирует webhook на проде (идемпотентно). На localhost не вызывается. */
export async function ensureTelegramWebhookRegistered(): Promise<boolean> {
  const token = getTelegramBotToken();
  const webhookUrl = resolveWebhookTargetUrl();
  if (!token || !webhookUrl) return false;

  const secret = getTelegramWebhookSecret();
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  };
  if (secret) {
    body.secret_token = secret;
  }

  try {
    const infoRes = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
    );
    const info = (await infoRes.json()) as WebhookInfo;
    const currentUrl = info.result?.url ?? "";
    const lastError = info.result?.last_error_message?.trim();

    await callBotApi("setWebhook", body);

    if (currentUrl !== webhookUrl || lastError) {
      console.info(
        `[telegram:webhook] зарегистрирован ${webhookUrl}${secret ? " (secret)" : ""}${lastError ? `; был: ${lastError}` : ""}`,
      );
    }
    return true;
  } catch (error) {
    console.error("[telegram:webhook] не удалось зарегистрировать:", error);
    return false;
  }
}

export function isTelegramWebhookTargetLocal(): boolean {
  return resolveWebhookTargetUrl() === null;
}
