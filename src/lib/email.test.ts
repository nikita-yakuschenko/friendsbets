import { afterEach, describe, expect, it, vi } from "vitest";

describe("sendEmail auto-send gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("пропускает notification при EMAIL_AUTO_SEND=false", async () => {
    vi.stubEnv("EMAIL_AUTO_SEND", "false");
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");

    const sent = await sendEmail({
      to: "user@test.local",
      subject: "Напоминание",
      text: "body",
      kind: "notification",
    });

    expect(sent).toBe(false);
    expect(log).toHaveBeenCalledWith(
      "[email:skipped:auto-disabled]",
      "user@test.local",
      "Напоминание",
    );
  });

  it("отправляет transactional при EMAIL_AUTO_SEND=false", async () => {
    vi.stubEnv("EMAIL_AUTO_SEND", "false");
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");

    const sent = await sendEmail({
      to: "user@test.local",
      subject: "Подтверждение",
      text: "body",
      kind: "transactional",
    });

    expect(sent).toBe(true);
    expect(log).toHaveBeenCalledWith(
      "[email:mock]",
      "user@test.local",
      "Подтверждение",
      "body",
    );
  });
});

describe("isAutoEmailSendingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("по умолчанию включено", async () => {
    const { isAutoEmailSendingEnabled } = await import("@/lib/email");
    expect(isAutoEmailSendingEnabled()).toBe(true);
  });

  it("false при EMAIL_AUTO_SEND=false", async () => {
    vi.stubEnv("EMAIL_AUTO_SEND", "false");
    const { isAutoEmailSendingEnabled } = await import("@/lib/email");
    expect(isAutoEmailSendingEnabled()).toBe(false);
  });
});
