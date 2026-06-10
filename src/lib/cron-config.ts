/** Фоновые задачи: sync — HTTP cron; напоминания — cron + встроенный планировщик в app. */

const CRON_LOG = "[cron]";

export function warnIfBackgroundCronNotConfigured(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.CRON_SECRET?.trim()) return;

  console.warn(
    `${CRON_LOG} CRON_SECRET не задан — настройте Dokploy Scheduled Tasks:`,
    "/api/cron/sync-matches?mode=quick (каждые 1–5 мин в день матчей),",
    "/api/cron/prediction-reminders (каждые 5–10 мин, резерв).",
    "Напоминания H24 также опрашивает встроенный планировщик при старте контейнера.",
    "Без cron счёт матчей не обновляется.",
  );
}
