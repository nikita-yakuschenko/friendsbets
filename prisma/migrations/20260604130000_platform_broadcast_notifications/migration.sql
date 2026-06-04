-- AlterEnum
ALTER TYPE "UserNotificationKind" ADD VALUE 'PLATFORM_BROADCAST';

-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN "title" TEXT;
ALTER TABLE "UserNotification" ADD COLUMN "body" TEXT;
