-- Напоминание о прогнозе: кнопка в приложении, CTA в почте и маскированная ссылка в Telegram.
ALTER TYPE "UserNotificationKind" ADD VALUE 'MISSING_PREDICTION';

ALTER TABLE "UserNotification" ADD COLUMN "actionInviteCode" TEXT;
