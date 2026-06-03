import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(async () => "hashed"),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  setSession: vi.fn(),
  clearSession: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/email-verification", () => ({
  sendEmailVerificationMessage: vi.fn(),
  userNeedsEmailVerification: vi.fn(() => false),
}));

vi.mock("@/lib/game-invite", () => ({
  findGameByInviteCode: vi.fn(),
}));

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginAction, registerAction } from "@/server/actions/auth";

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("требует email и пароль", async () => {
    const result = await loginAction(undefined, form({ email: "", password: "" }));
    expect(result.error).toMatch(/email/i);
  });

  it("отклоняет неверные учётные данные", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "a@b.c",
      name: "A",
      passwordHash: "hash",
      role: "PARTICIPANT",
      emailVerifiedAt: new Date(),
      emailVerificationExpiresAt: null,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await loginAction(
      undefined,
      form({ email: "a@b.c", password: "wrong" }),
    );
    expect(result.error).toMatch(/неверный/i);
  });
});

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("отклоняет honeypot", async () => {
    const result = await registerAction(
      undefined,
      form({
        name: "Test",
        email: "new@test.com",
        password: "secret1",
        website: "bot",
      }),
    );
    expect(result.error).toMatch(/отклонена/i);
  });

  it("требует пароль не короче 6 символов", async () => {
    const result = await registerAction(
      undefined,
      form({ name: "Test", email: "new@test.com", password: "123" }),
    );
    expect(result.error).toMatch(/6 символов/i);
  });

  it("не пускает при превышении rate limit", async () => {
    const email = `ratelimit-${Date.now()}@test.com`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(`register:${email}`, 5, 60 * 60 * 1000);
    }
    const result = await registerAction(
      undefined,
      form({ name: "Test", email, password: "secret12" }),
    );
    expect(result.error).toMatch(/слишком много/i);
  });
});
