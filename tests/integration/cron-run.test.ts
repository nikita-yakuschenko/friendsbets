import { afterAll, describe, expect, it } from "vitest";
import {
  CRON_JOB_IDS,
  getLastCronRuns,
  recordCronRun,
} from "@/lib/cron-run";
import {
  createTestPrisma,
  getTestDatabaseUrl,
} from "../helpers/integration-db";

const testDbUrl = getTestDatabaseUrl();
const describeIfDb = testDbUrl ? describe : describe.skip;

describeIfDb("CronRun integration", () => {
  const prisma = createTestPrisma();

  afterAll(async () => {
    await prisma.cronRun.deleteMany({
      where: { jobId: CRON_JOB_IDS.PREDICTION_REMINDERS },
    });
    await prisma.$disconnect();
  });

  it("сохраняет и читает последний запуск", async () => {
    const startedAt = new Date();
    await recordCronRun({
      jobId: CRON_JOB_IDS.PREDICTION_REMINDERS,
      ok: true,
      startedAt,
      summary: { sent: 0, checked: 0 },
    });

    const runs = await getLastCronRuns();
    const row = runs.find(
      (r) => r.jobId === CRON_JOB_IDS.PREDICTION_REMINDERS,
    );
    expect(row?.ok).toBe(true);
    expect(row?.durationMs).toBeGreaterThanOrEqual(0);
  });
});
