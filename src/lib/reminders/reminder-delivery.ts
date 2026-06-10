import { UserNotificationKind } from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/create-user-notification";
import { sendEmail } from "@/lib/email";
import { logOperationError, maskEmail } from "@/lib/logger";
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
  email: string;
  emailVerifiedAt: Date | null;
  telegramChatId: bigint | null;
  title: string;
  inAppBody: string;
  inviteCode: string;
  emailSubject: string;
  emailText: string;
  emailHtml: string;
  telegramHtml?: string;
  logTag: string;
}): Promise<ReminderDeliveryResult> {
  const result: ReminderDeliveryResult = {
    inApp: false,
    email: false,
    telegram: false,
    anyDelivered: false,
  };

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

  if (params.telegramHtml && params.telegramChatId && isTelegramConfigured()) {
    try {
      await sendTelegramMessage(
        params.telegramChatId,
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

  if (params.emailVerifiedAt) {
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

  return result;
}
