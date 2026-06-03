import { describe, expect, it } from "vitest";
import { getDatabasePoolConfig } from "@/lib/db";

describe("getDatabasePoolConfig", () => {
  it("применяет безопасные дефолты", () => {
    const config = getDatabasePoolConfig("postgresql://localhost/test");
    expect(config.max).toBe(10);
    expect(config.idleTimeoutMillis).toBe(30_000);
    expect(config.connectionTimeoutMillis).toBe(10_000);
  });
});
