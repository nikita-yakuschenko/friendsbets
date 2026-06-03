import { describe, expect, it } from "vitest";
import {
  generateRandomInviteCode,
  normalizeInviteCodeInput,
  validateInviteCodeFormat,
} from "@/lib/invite-code";

describe("invite code", () => {
  it("нормализует ввод", () => {
    expect(normalizeInviteCodeInput("  ab12  ")).toBe("AB12");
  });

  it("принимает валидный код", () => {
    expect(validateInviteCodeFormat("ABC123")).toBeNull();
  });

  it("отклоняет короткий код", () => {
    expect(validateInviteCodeFormat("AB")).toMatch(/минимум/);
  });

  it("отклоняет кириллицу", () => {
    expect(validateInviteCodeFormat("КОД123")).toMatch(/латинские/);
  });

  it("генерирует код нужной длины", () => {
    const code = generateRandomInviteCode(8);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});
