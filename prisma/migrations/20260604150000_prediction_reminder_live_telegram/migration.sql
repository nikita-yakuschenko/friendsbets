-- Напоминание в момент старта матча (Telegram + email)
ALTER TYPE "PredictionReminderKind" ADD VALUE IF NOT EXISTS 'LIVE';
ALTER TYPE "PredictionReminderKind" ADD VALUE IF NOT EXISTS 'LIVE_ADMIN';
