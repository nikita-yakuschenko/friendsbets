import { GameParticipantRole, UserNotificationKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { postTelegramChannelNews } from "@/lib/telegram/channel";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramChannelConfigured, isTelegramConfigured } from "@/lib/telegram/config";

export type BroadcastAudience = "all" | "organizers" | "personal";

export type BroadcastChannels = {
  inApp: boolean;
  telegram: boolean;
};

export type PlatformBroadcastResult = {
  recipients: number;
  inApp: number;
  telegram: number;
  telegramFallbackInApp: number;
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
  const trimmedBody = params.body.trim();
  if (!trimmedTitle || !trimmedBody) {
    throw new Error("TITLE_AND_BODY_REQUIRED");
  }
  if (!params.channels.inApp && !params.channels.telegram) {
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
    };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, telegramChatId: true },
  });

  const inAppUserIds: string[] = [];
  const telegramQueue: { id: string; chatId: bigint }[] = [];
  let telegramFallbackInApp = 0;

  for (const user of users) {
    const linked = user.telegramChatId != null;

    if (params.channels.telegram && linked) {
      telegramQueue.push({ id: user.id, chatId: user.telegramChatId! });
      continue;
    }

    if (params.channels.inApp) {
      inAppUserIds.push(user.id);
      if (params.channels.telegram && !linked) {
        telegramFallbackInApp++;
      }
      continue;
    }

    if (params.channels.telegram && !linked) {
      inAppUserIds.push(user.id);
      telegramFallbackInApp++;
    }
  }

  let inApp = 0;
  if (inAppUserIds.length > 0) {
    const result = await prisma.userNotification.createMany({
      data: inAppUserIds.map((userId) => ({
        userId,
        kind: UserNotificationKind.PLATFORM_BROADCAST,
        title: trimmedTitle,
        body: trimmedBody,
      })),
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
          await prisma.userNotification.create({
            data: {
              userId: user.id,
              kind: UserNotificationKind.PLATFORM_BROADCAST,
              title: trimmedTitle,
              body: trimmedBody,
            },
          });
          inApp++;
          telegramFallbackInApp++;
        }
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
  };
}
