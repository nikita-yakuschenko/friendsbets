import { describe, expect, it } from "vitest";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as cronHealthGet } from "@/app/api/health/cron/route";

describe("health routes", () => {
  it("/api/health возвращает ok", async () => {
    const res = await healthGet();
    const body = await res.json();
    expect(body).toEqual({ ok: true, service: "friendsbets" });
  });

  it("/api/health/cron описывает jobs без секретов", async () => {
    const res = await cronHealthGet();
    const body = await res.json();
    expect(body.jobs?.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toMatch(/CRON_SECRET|DATABASE_URL/);
    expect(typeof body.persistence).toBe("boolean");
  });
});
