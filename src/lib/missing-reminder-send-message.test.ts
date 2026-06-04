import { describe, expect, it } from "vitest";
import { formatMissingReminderSendFeedback } from "@/lib/missing-reminder-send-message";

describe("formatMissingReminderSendFeedback", () => {
  it("email без подтверждения — понятная ошибка", () => {
    const out = formatMissingReminderSendFeedback(
      { recipients: 2, inApp: 0, email: 0, telegram: 0, skipped: 2 },
      "email",
    );
    expect(out.error).toMatch(/подтверждён/i);
    expect(out.detail).toMatch(/Уведомления/i);
  });

  it("успех с разбивкой по каналам", () => {
    const out = formatMissingReminderSendFeedback(
      { recipients: 3, inApp: 2, email: 0, telegram: 1, skipped: 0 },
      "everywhere",
    );
    expect(out.message).toMatch(/отправлено 3/i);
    expect(out.detail).toContain("Telegram");
  });
});
