import { prisma } from "@/lib/db";
import { logOperationError } from "@/lib/logger";

export const CRON_JOB_IDS = {
  SYNC_MATCHES: "sync-matches",
  PREDICTION_REMINDERS: "prediction-reminders",
} as const;

export type CronJobId = (typeof CRON_JOB_IDS)[keyof typeof CRON_JOB_IDS];

export type CronRunSummary = Record<string, string | number | boolean | null>;

export async function recordCronRun(params: {
  jobId: CronJobId;
  ok: boolean;
  startedAt: Date;
  mode?: string;
  summary?: CronRunSummary;
}): Promise<void> {
  const finishedAt = new Date();
  try {
    await prisma.cronRun.create({
      data: {
        jobId: params.jobId,
        ok: params.ok,
        mode: params.mode,
        startedAt: params.startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - params.startedAt.getTime(),
        summaryJson: params.summary ?? undefined,
      },
    });
  } catch (error) {
    logOperationError("cron-run:record", error, { jobId: params.jobId });
  }
}

export type CronJobLastRun = {
  jobId: CronJobId;
  ok: boolean;
  mode: string | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

export async function getLastCronRuns(): Promise<CronJobLastRun[]> {
  const jobIds = Object.values(CRON_JOB_IDS);
  const rows: CronJobLastRun[] = [];

  for (const jobId of jobIds) {
    const last = await prisma.cronRun.findFirst({
      where: { jobId },
      orderBy: { startedAt: "desc" },
    });
    if (!last) continue;
    rows.push({
      jobId: jobId as CronJobId,
      ok: last.ok,
      mode: last.mode,
      startedAt: last.startedAt.toISOString(),
      finishedAt: last.finishedAt.toISOString(),
      durationMs: last.durationMs,
    });
  }

  return rows;
}
