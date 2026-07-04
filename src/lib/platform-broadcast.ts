import { GameParticipantRole, UserNotificationKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  mapUserNotificationsWithSignoff,
  createUserNotification,
} from "@/lib/create-user-notification";
import { withNotificationSignoff } from "@/lib/notification-signoff";
import { postTelegramChannelNews } from "@/lib/telegram/channel";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramChannelConfigured, isTelegramConfigured } from "@/lib/telegram/config";
import {
  shouldNotifyByEmail,
  shouldNotifyByTelegram,
  shouldNotifyInApp,
} from "@/lib/notification-preferences";

export type BroadcastAudience = "all" | "organizers" | "personal";

export type BroadcastChannels = {
  inApp: boolean;
  telegram: boolean;
  email: boolean;
};

export type PlatformBroadcastResult = {
  recipients: number;
  inApp: number;
  telegram: number;
  telegramFallbackInApp: number;
  email: number;
  emailSkippedUnverified: number;
};

export async function resolveBroadcastRecipientIds(
  audience: BroadcastAudience,
  personalUserIds: string[],
): Promise<string[]> {
  if (audience === "personal") {
    return [...new Set(personalUserIds)];
  }

  if (audience === "organizers") {
    const rows = await prisma.user.findMany({
      where: {
        gameParticipants: { some: { role: GameParticipantRole.ORGANIZER } },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  const rows = await prisma.user.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

/** Рассылка с выбором аудитории и каналов. */
export async function sendPlatformNotificationBroadcast(params: {
  title: string;
  body: string;
  audience: BroadcastAudience;
  personalUserIds?: string[];
  channels: BroadcastChannels;
}): Promise<PlatformBroadcastResult> {
  const trimmedTitle = params.title.trim();
  const trimmedBody = withNotificationSignoff(params.body.trim());
  if (!trimmedTitle || !trimmedBody) {
    throw new Error("TITLE_AND_BODY_REQUIRED");
  }
  if (
    !params.channels.inApp &&
    !params.channels.telegram &&
    !params.channels.email
  ) {
    throw new Error("CHANNEL_REQUIRED");
  }

  const userIds = await resolveBroadcastRecipientIds(
    params.audience,
    params.personalUserIds ?? [],
  );

  if (userIds.length === 0) {
    return {
      recipients: 0,
      inApp: 0,
      telegram: 0,
      telegramFallbackInApp: 0,
      email: 0,
      emailSkippedUnverified: 0,
    };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      telegramChatId: true,
      notifyByEmail: true,
      notifyByTelegram: true,
      notifyInApp: true,
    },
  });

  const inAppUserIds: string[] = [];
  const telegramQueue: { id: string; chatId: bigint }[] = [];
  const emailQueue: { id: string; email: string }[] = [];
  let telegramFallbackInApp = 0;
  let emailSkippedUnverified = 0;

  for (const user of users) {
    const prefs = {
      notifyByEmail: user.notifyByEmail,
      notifyByTelegram: user.notifyByTelegram,
      notifyInApp: user.notifyInApp,
      emailVerifiedAt: user.emailVerifiedAt,
      telegramChatId: user.telegramChatId,
    };
    const linked = shouldNotifyByTelegram(prefs);
    const verified = shouldNotifyByEmail(prefs);
    const inAppEnabled = shouldNotifyInApp(prefs);

    if (params.channels.telegram && linked) {
      telegramQueue.push({ id: user.id, chatId: user.telegramChatId! });
    } else if (params.channels.inApp && inAppEnabled) {
      inAppUserIds.push(user.id);
      if (params.channels.telegram && !linked) {
        telegramFallbackInApp++;
      }
    } else if (params.channels.telegram && !linked && inAppEnabled) {
      inAppUserIds.push(user.id);
      telegramFallbackInApp++;
    }

    if (params.channels.email) {
      if (verified) {
        emailQueue.push({ id: user.id, email: user.email });
      } else if (user.emailVerifiedAt == null) {
        emailSkippedUnverified++;
      }
    }
  }

  let inApp = 0;
  if (inAppUserIds.length > 0) {
    const result = await prisma.userNotification.createMany({
      data: mapUserNotificationsWithSignoff(
        inAppUserIds.map((userId) => ({
          userId,
          kind: UserNotificationKind.PLATFORM_BROADCAST,
          title: trimmedTitle,
          body: trimmedBody,
        })),
      ),
    });
    inApp = result.count;
  }

  let telegram = 0;
  if (params.channels.telegram && isTelegramConfigured()) {
    const message = appendTelegramChannelFooter(
      `${trimmedTitle}\n\n${trimmedBody}`,
    );

    for (const user of telegramQueue) {
      try {
        await sendTelegramMessage(user.chatId, message);
        telegram++;
      } catch (error) {
        console.error(`[broadcast:telegram:${user.id}]`, error);
        if (!params.channels.inApp) {
          const fallbackUser = users.find((row) => row.id === user.id);
          if (fallbackUser && shouldNotifyInApp(fallbackUser)) {
            await createUserNotification({
              userId: user.id,
              kind: UserNotificationKind.PLATFORM_BROADCAST,
              title: trimmedTitle,
              body: trimmedBody,
            });
            inApp++;
            telegramFallbackInApp++;
          }
        }
      }
    }
  }

  let email = 0;
  if (params.channels.email && emailQueue.length > 0) {
    const html = trimmedBody.replace(/\n/g, "<br>");
    for (const user of emailQueue) {
      try {
        await sendEmail({
          to: user.email,
          subject: trimmedTitle,
          text: trimmedBody,
          html,
          kind: "admin",
        });
        email++;
      } catch (error) {
        console.error(`[broadcast:email:${user.id}]`, error);
      }
    }
  }

  if (
    params.audience === "all" &&
    params.channels.telegram &&
    isTelegramChannelConfigured()
  ) {
    postTelegramChannelNews(`${trimmedTitle}\n\n${trimmedBody}`);
  }

  return {
    recipients: users.length,
    inApp,
    telegram,
    telegramFallbackInApp,
    email,
    emailSkippedUnverified,
  };
}
