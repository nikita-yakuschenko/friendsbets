-- Prediction reminder emails (3h, 1h, 15m before match)
CREATE TYPE "PredictionReminderKind" AS ENUM ('H3', 'H1', 'M15');

CREATE TABLE "PredictionReminder" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PredictionReminderKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PredictionReminder_gameId_matchId_userId_kind_key" ON "PredictionReminder"("gameId", "matchId", "userId", "kind");
CREATE INDEX "PredictionReminder_matchId_idx" ON "PredictionReminder"("matchId");
CREATE INDEX "PredictionReminder_userId_idx" ON "PredictionReminder"("userId");

ALTER TABLE "PredictionReminder" ADD CONSTRAINT "PredictionReminder_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PredictionReminder" ADD CONSTRAINT "PredictionReminder_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PredictionReminder" ADD CONSTRAINT "PredictionReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
