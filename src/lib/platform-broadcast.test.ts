import { describe, expect, it } from "vitest";

/** Логика маршрутизации каналов (без БД). */
function routeRecipient(
  linked: boolean,
  channels: { inApp: boolean; telegram: boolean },
): "telegram" | "inApp" | "none" {
  if (channels.telegram && linked) return "telegram";
  if (channels.inApp) return "inApp";
  if (channels.telegram && !linked) return "inApp";
  return "none";
}

describe("platform broadcast routing", () => {
  it("только TG + привязан → telegram", () => {
    expect(routeRecipient(true, { inApp: false, telegram: true })).toBe(
      "telegram",
    );
  });

  it("только TG + не привязан → inApp", () => {
    expect(routeRecipient(false, { inApp: false, telegram: true })).toBe(
      "inApp",
    );
  });

  it("оба + привязан → telegram", () => {
    expect(routeRecipient(true, { inApp: true, telegram: true })).toBe(
      "telegram",
    );
  });

  it("оба + не привязан → inApp", () => {
    expect(routeRecipient(false, { inApp: true, telegram: true })).toBe(
      "inApp",
    );
  });

  it("только сайт → inApp", () => {
    expect(routeRecipient(true, { inApp: true, telegram: false })).toBe(
      "inApp",
    );
  });
});
