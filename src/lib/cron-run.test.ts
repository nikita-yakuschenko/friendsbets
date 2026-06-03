import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    cronRun: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  CRON_JOB_IDS,
  getLastCronRuns,
  recordCronRun,
} from "@/lib/cron-run";

describe("cron-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recordCronRun сохраняет успешный запуск", async () => {
    const startedAt = new Date("2026-06-01T12:00:00Z");
    vi.mocked(prisma.cronRun.create).mockResolvedValue({} as never);

    await recordCronRun({
      jobId: CRON_JOB_IDS.SYNC_MATCHES,
      ok: true,
      startedAt,
      mode: "quick",
      summary: { created: 1 },
    });

    expect(prisma.cronRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: "sync-matches",
          ok: true,
          mode: "quick",
        }),
      }),
    );
  });

  it("getLastCronRuns возвращает последние по jobId", async () => {
    vi.mocked(prisma.cronRun.findFirst).mockResolvedValue({
      ok: true,
      mode: "quick",
      startedAt: new Date("2026-06-01T12:00:00Z"),
      finishedAt: new Date("2026-06-01T12:01:00Z"),
      durationMs: 60_000,
    } as never);

    const runs = await getLastCronRuns();
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]?.jobId).toBeDefined();
  });
});
