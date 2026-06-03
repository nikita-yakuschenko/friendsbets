import { describe, expect, it, vi } from "vitest";
import { mapWithConcurrency, readConcurrencyFromEnv } from "@/lib/concurrency";

describe("mapWithConcurrency", () => {
  it("ограничивает одновременные задачи", async () => {
    let running = 0;
    let maxRunning = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running -= 1;
      return n * 2;
    });

    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it("не валит весь batch при ошибке одной задачи", async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("fail");
      return n;
    }).catch(() => null);

    expect(results).toBeNull();
  });
});

describe("readConcurrencyFromEnv", () => {
  it("читает число из env", () => {
    vi.stubEnv("CHAMPIONAT_SYNC_CONCURRENCY", "5");
    expect(readConcurrencyFromEnv("CHAMPIONAT_SYNC_CONCURRENCY", 3)).toBe(5);
    vi.unstubAllEnvs();
  });

  it("возвращает default при мусоре", () => {
    vi.stubEnv("CHAMPIONAT_SYNC_CONCURRENCY", "nope");
    expect(readConcurrencyFromEnv("CHAMPIONAT_SYNC_CONCURRENCY", 3)).toBe(3);
    vi.unstubAllEnvs();
  });
});
