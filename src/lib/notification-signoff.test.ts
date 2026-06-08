import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_SIGNOFF,
  withNotificationSignoff,
} from "@/lib/notification-signoff";

describe("notification signoff", () => {
  it("добавляет подпись в конец", () => {
    expect(withNotificationSignoff("Привет")).toBe(
      `Привет\n\n${NOTIFICATION_SIGNOFF}`,
    );
  });

  it("не дублирует подпись", () => {
    const signed = `Текст\n\n${NOTIFICATION_SIGNOFF}`;
    expect(withNotificationSignoff(signed)).toBe(signed);
  });
});
