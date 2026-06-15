import { UserNotificationKind } from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/create-user-notification";
import { sendEmail } from "@/lib/email";
import { logOperationError, maskEmail } from "@/lib/logger";
import {
  shouldNotifyByEmail,
  shouldNotifyByTelegram,
  shouldNotifyInApp,
  type UserNotificationPreferenceFields,
} from "@/lib/notification-preferences";
import type { ReminderEmailBatch } from "@/lib/reminders/reminder-email-batch";
import type { ReminderEmailSection } from "@/lib/reminders/reminder-email-section";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";

export type ReminderDeliveryResult = {
  inApp: boolean;
  email: boolean;
  telegram: boolean;
  anyDelivered: boolean;
};

/** In-app, Telegram и email независимо: сбой одного канала не блокирует остальные. */
export async function deliverMatchReminderToUser(params: {
  userId: string;
  userName: string;
  email: string;
  emailVerifiedAt: Date | null;
  telegramChatId: bigint | null;
  notifyByEmail: boolean;
  notifyByTelegram: boolean;
  notifyInApp: boolean;
  title: string;
  inAppBody: string;
  inviteCode: string;
  emailSubject: string;
  emailText: string;
  emailHtml: string;
  emailSection?: ReminderEmailSection;
  emailBatch?: ReminderEmailBatch;
  telegramHtml?: string;
  logTag: string;
}): Promise<ReminderDeliveryResult> {
  const prefs: UserNotificationPreferenceFields = {
    notifyByEmail: params.notifyByEmail,
    notifyByTelegram: params.notifyByTelegram,
    notifyInApp: params.notifyInApp,
    emailVerifiedAt: params.emailVerifiedAt,
    telegramChatId: params.telegramChatId,
  };

  const result: ReminderDeliveryResult = {
    inApp: false,
    email: false,
    telegram: false,
    anyDelivered: false,
  };

  if (shouldNotifyInApp(prefs)) {
    try {
      await createUserNotification({
        userId: params.userId,
        kind: UserNotificationKind.MISSING_PREDICTION,
        title: params.title,
        body: params.inAppBody,
        actionInviteCode: params.inviteCode,
      });
      result.inApp = true;
      result.anyDelivered = true;
    } catch (error) {
      logOperationError(`${params.logTag}:in-app`, error, {
        userId: params.userId,
      });
    }
  }

  if (
    params.telegramHtml &&
    shouldNotifyByTelegram(prefs) &&
    isTelegramConfigured()
  ) {
    try {
      await sendTelegramMessage(
        params.telegramChatId!,
        appendTelegramChannelFooter(params.telegramHtml),
        { parseMode: "HTML" },
      );
      result.telegram = true;
      result.anyDelivered = true;
    } catch (error) {
      logOperationError(`${params.logTag}:telegram`, error, {
        userId: params.userId,
      });
    }
  }

  if (shouldNotifyByEmail(prefs)) {
    if (params.emailBatch && params.emailSection) {
      const queued = params.emailBatch.enqueue({
        userId: params.userId,
        email: params.email,
        userName: params.userName,
        emailVerifiedAt: params.emailVerifiedAt,
        notifyByEmail: params.notifyByEmail,
        section: params.emailSection,
      });
      if (queued) {
        result.email = true;
        result.anyDelivered = true;
      }
    } else {
      try {
        await sendEmail({
          to: params.email,
          subject: params.emailSubject,
          text: params.emailText,
          html: params.emailHtml,
        });
        result.email = true;
        result.anyDelivered = true;
      } catch (error) {
        logOperationError(`${params.logTag}:email`, error, {
          userId: params.userId,
          email: maskEmail(params.email),
        });
      }
    }
  }

  return result;
}
