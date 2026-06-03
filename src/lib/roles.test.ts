import { describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/client";
import { hasPermission, isSuperadmin } from "@/lib/roles";

describe("roles", () => {
  it("определяет суперадмина", () => {
    expect(isSuperadmin(UserRole.ADMIN)).toBe(true);
    expect(isSuperadmin(UserRole.PARTICIPANT)).toBe(false);
  });

  it("разграничивает platformAdmin и gamePlay", () => {
    expect(hasPermission(UserRole.ADMIN, "platformAdmin")).toBe(true);
    expect(hasPermission(UserRole.PARTICIPANT, "platformAdmin")).toBe(false);
    expect(hasPermission(UserRole.PARTICIPANT, "gamePlay")).toBe(true);
  });
});
