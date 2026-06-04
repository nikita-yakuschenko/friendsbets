import "dotenv/config";
import { getTelegramBotToken } from "../src/lib/telegram/config";
import { handleTelegramUpdate } from "../src/lib/telegram/webhook";

type TelegramUpdate = Parameters<typeof handleTelegramUpdate>[0];

async function callBotApi<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const token = getTelegramBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
  };
  if (!data.ok) {
    throw new Error(data.description ?? `${method} failed`);
  }
  return data.result as T;
}

async function main() {
  if (!getTelegramBotToken()) {
    console.error("[telegram:poll] Задайте TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }

  console.warn(
    "[telegram:poll] deleteWebhook отключит прод-бот, если тот же токен. Для локалки лучше отдельный тестовый бот.",
  );

  await callBotApi("deleteWebhook", { drop_pending_updates: false });
  console.info("[telegram:poll] Webhook снят. Ожидаю сообщения (Ctrl+C — выход)…");

  let offset = 0;

  for (;;) {
    const updates = await callBotApi<TelegramUpdate[]>("getUpdates", {
      offset,
      timeout: 50,
      allowed_updates: ["message"],
    });

    for (const update of updates ?? []) {
      try {
        await handleTelegramUpdate(update);
      } catch (error) {
        console.error("[telegram:poll] update error:", error);
      }
      offset = Math.max(offset, update.update_id + 1);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
