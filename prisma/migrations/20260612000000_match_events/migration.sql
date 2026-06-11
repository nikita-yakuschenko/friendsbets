-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "minute" INTEGER,
    "minuteLabel" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "assistName" TEXT,
    "score" TEXT,
    "teamSide" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_matchId_externalKey_key" ON "MatchEvent"("matchId", "externalKey");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_sortOrder_idx" ON "MatchEvent"("matchId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "liveMinute" INTEGER,
ADD COLUMN "livePhaseCache" TEXT,
ADD COLUMN "liveStatusRaw" TEXT,
ADD COLUMN "eventsSyncedAt" TIMESTAMP(3);
