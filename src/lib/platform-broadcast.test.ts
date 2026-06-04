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

function routeEmail(
  verified: boolean,
  channelEmail: boolean,
): "email" | "skip" | "none" {
  if (!channelEmail) return "none";
  return verified ? "email" : "skip";
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

  it("email + подтверждён → email", () => {
    expect(routeEmail(true, true)).toBe("email");
  });

  it("email + не подтверждён → skip", () => {
    expect(routeEmail(false, true)).toBe("skip");
  });

  it("TG + привязан и email параллельно", () => {
    expect(routeRecipient(true, { inApp: false, telegram: true })).toBe(
      "telegram",
    );
    expect(routeEmail(true, true)).toBe("email");
  });
});
