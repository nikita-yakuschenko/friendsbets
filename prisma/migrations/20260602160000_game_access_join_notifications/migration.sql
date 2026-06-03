-- CreateEnum
CREATE TYPE "GameAccessMode" AS ENUM ('OPEN', 'REQUEST');

-- CreateEnum
CREATE TYPE "GameJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserNotificationKind" AS ENUM ('JOIN_REQUEST_RECEIVED', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_REJECTED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "accessMode" "GameAccessMode" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "GameJoinRequest" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GameJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,

    CONSTRAINT "GameJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "UserNotificationKind" NOT NULL,
    "joinRequestId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameJoinRequest_gameId_userId_key" ON "GameJoinRequest"("gameId", "userId");

-- CreateIndex
CREATE INDEX "GameJoinRequest_gameId_status_idx" ON "GameJoinRequest"("gameId", "status");

-- CreateIndex
CREATE INDEX "GameJoinRequest_userId_idx" ON "GameJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "UserNotification_userId_readAt_idx" ON "UserNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_joinRequestId_idx" ON "UserNotification"("joinRequestId");

-- AddForeignKey
ALTER TABLE "GameJoinRequest" ADD CONSTRAINT "GameJoinRequest_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameJoinRequest" ADD CONSTRAINT "GameJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameJoinRequest" ADD CONSTRAINT "GameJoinRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_joinRequestId_fkey" FOREIGN KEY ("joinRequestId") REFERENCES "GameJoinRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
