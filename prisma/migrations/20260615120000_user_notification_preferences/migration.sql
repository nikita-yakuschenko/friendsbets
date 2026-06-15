-- Каналы доставки уведомлений в профиле пользователя
ALTER TABLE "User"
  ADD COLUMN "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyByTelegram" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyInApp" BOOLEAN NOT NULL DEFAULT true;
