import { describe, expect, it } from "vitest";
import { normalizeUserEmail } from "@/lib/normalize-user-email";

describe("normalizeUserEmail", () => {
  it("приводит к нижнему регистру и обрезает пробелы", () => {
    expect(normalizeUserEmail("  Test@Mail.COM  ")).toBe("test@mail.com");
  });

  it("убирает zero-width символы", () => {
    expect(normalizeUserEmail("user\u200b@mail.com")).toBe("user@mail.com");
  });
});
