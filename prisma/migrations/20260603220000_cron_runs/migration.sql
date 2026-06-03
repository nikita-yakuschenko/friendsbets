-- CreateTable
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "mode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "summaryJson" JSONB,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRun_jobId_startedAt_idx" ON "CronRun"("jobId", "startedAt" DESC);
