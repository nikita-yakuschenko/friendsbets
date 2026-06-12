/** Обязательные данные платформы при каждом старте Node (dev / start / Docker). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.DATABASE_URL) return;

  const { bootPlatformEssentials } = await import("@/lib/platform-essentials");
  await bootPlatformEssentials();

  const { warnIfBackgroundCronNotConfigured } = await import("@/lib/cron-config");
  warnIfBackgroundCronNotConfigured();

  const { ensureTelegramWebhookRegistered } = await import(
    "@/lib/telegram/register-webhook"
  );
  await ensureTelegramWebhookRegistered();

  if (process.env.NODE_ENV === "production") {
    const { startBackgroundReminderScheduler } = await import(
      "@/lib/reminders/background-reminder-scheduler"
    );
    startBackgroundReminderScheduler();
  }

  if (process.env.BACKGROUND_CHAMPIONAT_SYNC !== "false") {
    const { startBackgroundChampionatSyncScheduler } = await import(
      "@/lib/football-api/championat/background-championat-sync-scheduler"
    );
    startBackgroundChampionatSyncScheduler();
  }

  if (process.env.BACKGROUND_CHAMPIONAT_LIVE_SYNC !== "false") {
    const { startBackgroundChampionatLiveSyncScheduler } = await import(
      "@/lib/football-api/championat/background-championat-live-sync-scheduler"
    );
    startBackgroundChampionatLiveSyncScheduler();
  }
}
