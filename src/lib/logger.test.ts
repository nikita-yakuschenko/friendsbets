import { describe, expect, it, vi } from "vitest";
import { logOperation, maskEmail } from "@/lib/logger";

describe("logger", () => {
  it("маскирует email", () => {
    expect(maskEmail("ab")).toBe("***");
    expect(maskEmail("user@example.com")).toMatch(/\*\*\*@example\.com/);
    expect(maskEmail("user@example.com")).not.toContain("user@");
  });

  it("logOperation пишет JSON без undefined", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logOperation("test-op", { ok: true, skip: undefined });
    expect(spy).toHaveBeenCalled();
    const line = String(spy.mock.calls[0]?.[1]);
    expect(line).toContain("ok");
    expect(line).not.toContain("skip");
    spy.mockRestore();
  });
});
