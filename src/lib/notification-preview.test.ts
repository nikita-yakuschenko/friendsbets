import { describe, expect, it } from "vitest";
import {
  formatNotificationMessage,
  notificationHref,
} from "@/lib/notification-preview";
import { USER_NOTIFICATION_KIND } from "@/lib/notification-types";

describe("formatNotificationMessage", () => {
  it("форматирует заявку на вступление", () => {
    const msg = formatNotificationMessage({
      kind: USER_NOTIFICATION_KIND.JOIN_REQUEST_RECEIVED,
      applicantName: "Иван",
      gameTitle: "Кубок",
    });
    expect(msg).toContain("Иван");
    expect(msg).toContain("Кубок");
  });

  it("форматирует одобрение и отклонение", () => {
    expect(
      formatNotificationMessage({
        kind: USER_NOTIFICATION_KIND.JOIN_REQUEST_APPROVED,
        gameTitle: "A",
      }),
    ).toMatch(/приняли/i);
    expect(
      formatNotificationMessage({
        kind: USER_NOTIFICATION_KIND.JOIN_REQUEST_REJECTED,
        gameTitle: "B",
      }),
    ).toMatch(/отклонили/i);
  });
});

describe("notificationHref", () => {
  it("ведёт в раздел уведомлений турнира", () => {
    expect(notificationHref("ABC123")).toContain("/game/ABC123/");
    expect(notificationHref("ABC123")).toContain("notifications");
  });
});
