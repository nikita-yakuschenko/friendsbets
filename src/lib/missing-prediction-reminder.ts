import { UserNotificationKind } from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/create-user-notification";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  buildMissingPredictionEmailContent,
  buildMissingPredictionInAppBody,
  buildMissingPredictionTelegramPersonalHtml,
} from "@/lib/prediction-reminder-content";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";
import { formatRelativeTime } from "@/lib/utils";
import {
  shouldNotifyByEmail,
  shouldNotifyByTelegram,
  shouldNotifyInApp,
} from "@/lib/notification-preferences";

export type MissingReminderChannel =
  | "telegram"
  | "email"
  | "inApp"
  | "everywhere";

export type MissingReminderSendResult = {
  recipients: number;
  inApp: number;
  email: number;
  telegram: number;
  skipped: number;
};

export {
  buildMissingPredictionCopyText as buildMissingPredictionReminderText,
} from "@/lib/prediction-reminder-content";

type ReminderPayload = {
  title: string;
  inviteCode: string;
  gameTitle: string;
  inAppBody: string;
  telegramHtml: string;
  email: { subject: string; text: string; html: string };
};

async function createInAppNotification(
  userId: string,
  payload: ReminderPayload,
): Promise<void> {
  await createUserNotification({
    userId,
    kind: UserNotificationKind.MISSING_PREDICTION,
    title: payload.title,
    body: payload.inAppBody,
    actionInviteCode: payload.inviteCode,
  });
}

async function deliverToUser(params: {
  userId: string;
  email: string;
  emailVerifiedAt: Date | null;
  telegramChatId: bigint | null;
  notifyByEmail: boolean;
  notifyByTelegram: boolean;
  notifyInApp: boolean;
  channel: MissingReminderChannel;
  payload: ReminderPayload;
}): Promise<{ inApp: boolean; email: boolean; telegram: boolean; skipped: boolean }> {
  const result = { inApp: false, email: false, telegram: false, skipped: false };
  const prefs = {
    notifyByEmail: params.notifyByEmail,
    notifyByTelegram: params.notifyByTelegram,
    notifyInApp: params.notifyInApp,
    emailVerifiedAt: params.emailVerifiedAt,
    telegramChatId: params.telegramChatId,
  };
  const linked = shouldNotifyByTelegram(prefs);
  const verified = shouldNotifyByEmail(prefs);
  const { payload } = params;

  if (params.channel === "telegram") {
    if (linked && isTelegramConfigured()) {
      try {
        await sendTelegramMessage(
          params.telegramChatId!,
          appendTelegramChannelFooter(payload.telegramHtml),
          { parseMode: "HTML" },
        );
        result.telegram = true;
        return result;
      } catch (error) {
        console.error(`[missing-reminder:telegram:${params.userId}]`, error);
      }
    }
    if (shouldNotifyInApp(prefs)) {
      await createInAppNotification(params.userId, payload);
      result.inApp = true;
    } else {
      result.skipped = true;
    }
    return result;
  }

  if (params.channel === "email") {
    if (!verified) {
      result.skipped = true;
      return result;
    }
    try {
      await sendEmail({
        to: params.email,
        subject: payload.email.subject,
        text: payload.email.text,
        html: payload.email.html,
      });
      result.email = true;
    } catch (error) {
      console.error(`[missing-reminder:email:${params.userId}]`, error);
      result.skipped = true;
    }
    return result;
  }

  if (params.channel === "inApp") {
    if (shouldNotifyInApp(prefs)) {
      await createInAppNotification(params.userId, payload);
      result.inApp = true;
    } else {
      result.skipped = true;
    }
    return result;
  }

  if (linked && isTelegramConfigured()) {
    try {
      await sendTelegramMessage(
        params.telegramChatId!,
        appendTelegramChannelFooter(payload.telegramHtml),
        { parseMode: "HTML" },
      );
      result.telegram = true;
    } catch (error) {
      console.error(`[missing-reminder:telegram:${params.userId}]`, error);
    }
  }

  if (verified) {
    try {
      await sendEmail({
        to: params.email,
        subject: payload.email.subject,
        text: payload.email.text,
        html: payload.email.html,
      });
      result.email = true;
    } catch (error) {
      console.error(`[missing-reminder:email:${params.userId}]`, error);
    }
  }

  if (shouldNotifyInApp(prefs)) {
    await createInAppNotification(params.userId, payload);
    result.inApp = true;
  }

  if (!result.inApp && !result.email && !result.telegram) {
    result.skipped = true;
  }

  return result;
}

export async function sendMissingPredictionReminders(params: {
  gameId: string;
  matchId: string;
  inviteCode: string;
  channel: MissingReminderChannel;
}): Promise<MissingReminderSendResult> {
  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      homeTeam: { select: { name: true, countryCode: true } },
      awayTeam: { select: { name: true, countryCode: true } },
    },
  });
  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const game = await prisma.game.findUnique({
    where: { id: params.gameId },
    include: { participants: true },
  });
  if (!game || game.inviteCode !== params.inviteCode) {
    throw new Error("GAME_NOT_FOUND");
  }

  const predictions = await prisma.prediction.findMany({
    where: { gameId: params.gameId, matchId: params.matchId },
    select: { userId: true },
  });
  const predicted = new Set(predictions.map((p) => p.userId));
  const missing = game.participants.filter((p) => !predicted.has(p.userId));

  if (missing.length === 0) {
    return { recipients: 0, inApp: 0, email: 0, telegram: 0, skipped: 0 };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: missing.map((p) => p.userId) } },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      telegramChatId: true,
      notifyByEmail: true,
      notifyByTelegram: true,
      notifyInApp: true,
    },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const title = `Прогноз: ${match.homeTeam.name} — ${match.awayTeam.name}`;

  const totals = {
    recipients: missing.length,
    inApp: 0,
    email: 0,
    telegram: 0,
    skipped: 0,
  };

  for (const participant of missing) {
    const user = userById.get(participant.userId);
    if (!user) {
      totals.skipped++;
      continue;
    }

    const displayName = participant.displayName || user.name;
    const inAppBody = buildMissingPredictionInAppBody({
      gameTitle: game.title,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startsAt: match.startsAt,
    });
    const telegramHtml = buildMissingPredictionTelegramPersonalHtml({
      gameTitle: game.title,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startsAt: match.startsAt,
      inviteCode: params.inviteCode,
    });
    const emailContent = buildMissingPredictionEmailContent({
      userName: displayName,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      gameTitle: game.title,
      startsAt: match.startsAt,
      inviteCode: params.inviteCode,
      timeLabel: formatRelativeTime(new Date(match.startsAt)),
    });

    const payload: ReminderPayload = {
      title,
      inviteCode: params.inviteCode,
      gameTitle: game.title,
      inAppBody,
      telegramHtml,
      email: {
        subject: title,
        text: emailContent.text,
        html: emailContent.html,
      },
    };

    const delivered = await deliverToUser({
      userId: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      telegramChatId: user.telegramChatId,
      notifyByEmail: user.notifyByEmail,
      notifyByTelegram: user.notifyByTelegram,
      notifyInApp: user.notifyInApp,
      channel: params.channel,
      payload,
    });

    if (delivered.inApp) totals.inApp++;
    if (delivered.email) totals.email++;
    if (delivered.telegram) totals.telegram++;
    if (delivered.skipped) totals.skipped++;
  }

  return totals;
}
