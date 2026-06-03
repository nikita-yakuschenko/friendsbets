import { describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/client";
import { userNeedsEmailVerification } from "@/lib/email-verification";

describe("userNeedsEmailVerification", () => {
  it("не требует у суперадмина", () => {
    expect(
      userNeedsEmailVerification({ role: UserRole.ADMIN, emailVerifiedAt: null }),
    ).toBe(false);
  });

  it("требует у участника без подтверждения", () => {
    expect(
      userNeedsEmailVerification({
        role: UserRole.PARTICIPANT,
        emailVerifiedAt: null,
      }),
    ).toBe(true);
  });

  it("не требует после подтверждения", () => {
    expect(
      userNeedsEmailVerification({
        role: UserRole.PARTICIPANT,
        emailVerifiedAt: new Date(),
      }),
    ).toBe(false);
  });
});
