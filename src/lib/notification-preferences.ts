export type UserNotificationPreferenceFields = {
  notifyByEmail: boolean;
  notifyByTelegram: boolean;
  notifyInApp: boolean;
  emailVerifiedAt?: Date | null;
  telegramChatId?: bigint | null;
};

export const userNotificationPrefsSelect = {
  notifyByEmail: true,
  notifyByTelegram: true,
  notifyInApp: true,
  emailVerifiedAt: true,
  telegramChatId: true,
} as const;

export function shouldNotifyInApp(
  prefs: Pick<UserNotificationPreferenceFields, "notifyInApp">,
): boolean {
  return prefs.notifyInApp;
}

export function shouldNotifyByEmail(
  prefs: Pick<
    UserNotificationPreferenceFields,
    "notifyByEmail" | "emailVerifiedAt"
  >,
): boolean {
  return prefs.notifyByEmail && prefs.emailVerifiedAt != null;
}

export function shouldNotifyByTelegram(
  prefs: Pick<
    UserNotificationPreferenceFields,
    "notifyByTelegram" | "telegramChatId"
  >,
): boolean {
  return prefs.notifyByTelegram && prefs.telegramChatId != null;
}
