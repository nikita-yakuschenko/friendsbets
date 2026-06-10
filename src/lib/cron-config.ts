/** Фоновые задачи (sync, напоминания) — только через HTTP cron, не при заходе пользователя. */

const CRON_LOG = "[cron]";

export function warnIfBackgroundCronNotConfigured(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.CRON_SECRET?.trim()) return;

  console.warn(
    `${CRON_LOG} CRON_SECRET не задан — настройте Dokploy Scheduled Tasks:`,
    "/api/cron/sync-matches?mode=quick (каждые 1–5 мин в день матчей),",
    "/api/cron/prediction-reminders (каждые 5–10 мин).",
    "Без cron уведомления и обновление счёта не работают, пока кто-то не откроет админку.",
  );
}
