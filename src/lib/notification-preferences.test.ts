import { describe, expect, it } from "vitest";
import {
  shouldNotifyByEmail,
  shouldNotifyByTelegram,
  shouldNotifyInApp,
} from "@/lib/notification-preferences";

describe("notification preferences", () => {
  it("in-app только при включённой настройке", () => {
    expect(shouldNotifyInApp({ notifyInApp: true })).toBe(true);
    expect(shouldNotifyInApp({ notifyInApp: false })).toBe(false);
  });

  it("email только при включённой настройке и подтверждённом адресе", () => {
    expect(
      shouldNotifyByEmail({
        notifyByEmail: true,
        emailVerifiedAt: new Date(),
      }),
    ).toBe(true);
    expect(
      shouldNotifyByEmail({
        notifyByEmail: true,
        emailVerifiedAt: null,
      }),
    ).toBe(false);
    expect(
      shouldNotifyByEmail({
        notifyByEmail: false,
        emailVerifiedAt: new Date(),
      }),
    ).toBe(false);
  });

  it("telegram только при включённой настройке и привязке", () => {
    expect(
      shouldNotifyByTelegram({
        notifyByTelegram: true,
        telegramChatId: BigInt(1),
      }),
    ).toBe(true);
    expect(
      shouldNotifyByTelegram({
        notifyByTelegram: true,
        telegramChatId: null,
      }),
    ).toBe(false);
    expect(
      shouldNotifyByTelegram({
        notifyByTelegram: false,
        telegramChatId: BigInt(1),
      }),
    ).toBe(false);
  });
});
