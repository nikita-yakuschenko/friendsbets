import "dotenv/config";
import { ensureTelegramWebhookRegistered } from "../src/lib/telegram/register-webhook";
import { getTelegramBotToken } from "../src/lib/telegram/config";

async function main() {
  if (!getTelegramBotToken()) {
    console.error("[telegram:webhook] Задайте TELEGRAM_BOT_TOKEN в .env");
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (!appUrl || /localhost|127\.0\.0\.1/i.test(appUrl)) {
    console.error(
      "[telegram:webhook] Для регистрации задайте прод-URL, например:\n" +
        '  $env:NEXT_PUBLIC_APP_URL="https://friendsbets.ru"; npm run telegram:webhook',
    );
    process.exit(1);
  }

  const ok = await ensureTelegramWebhookRegistered();
  if (!ok) {
    process.exit(1);
  }
  console.info("[telegram:webhook] Готово. Проверьте /start в боте.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
