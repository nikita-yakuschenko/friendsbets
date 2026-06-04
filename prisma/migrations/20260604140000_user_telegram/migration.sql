-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramChatId" BIGINT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "telegramLinkToken" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramLinkExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");
CREATE UNIQUE INDEX "User_telegramLinkToken_key" ON "User"("telegramLinkToken");
