import { UserNotificationKind } from "@/generated/prisma/client";
import { absoluteAppUrl } from "@/lib/app-origin";
import { gamePath } from "@/lib/game-path";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";
import { formatDateTimeMoscow, formatRelativeTime } from "@/lib/utils";

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

function countryCodeToFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

function formatMatchLine(
  home: { name: string; countryCode: string | null },
  away: { name: string; countryCode: string | null },
): string {
  const homeFlag = countryCodeToFlagEmoji(home.countryCode);
  const awayFlag = countryCodeToFlagEmoji(away.countryCode);
  const homePart = homeFlag ? `${home.name} ${homeFlag}` : home.name;
  const awayPart = awayFlag ? `${awayFlag} ${away.name}` : away.name;
  return `${homePart} - ${awayPart}`;
}

export function buildMissingPredictionReminderText(params: {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
  inviteCode: string;
  origin?: string;
}): string {
  const link = absoluteAppUrl(
    gamePath(params.inviteCode, "predictions"),
    params.origin,
  );
  const startsAt = new Date(params.startsAt);

  return [
    "Ты не сделал прогноз на матч",
    formatMatchLine(params.homeTeam, params.awayTeam),
    `матч начнётся ${formatDateTimeMoscow(startsAt)}`,
    `до начала матча ${formatRelativeTime(startsAt)}`,
    "",
    link,
    "",
    "Твоя команда FriendsBets 💚",
  ].join("\n");
}

async function deliverToUser(params: {
  userId: string;
  email: string;
  emailVerifiedAt: Date | null;
  telegramChatId: bigint | null;
  channel: MissingReminderChannel;
  title: string;
  body: string;
}): Promise<{ inApp: boolean; email: boolean; telegram: boolean; skipped: boolean }> {
  const result = { inApp: false, email: false, telegram: false, skipped: false };
  const linked = params.telegramChatId != null;
  const verified = params.emailVerifiedAt != null;

  if (params.channel === "telegram") {
    if (linked && isTelegramConfigured()) {
      try {
        await sendTelegramMessage(
          params.telegramChatId!,
          appendTelegramChannelFooter(params.body),
        );
        result.telegram = true;
        return result;
      } catch (error) {
        console.error(`[missing-reminder:telegram:${params.userId}]`, error);
      }
    }
    await prisma.userNotification.create({
      data: {
        userId: params.userId,
        kind: UserNotificationKind.PLATFORM_BROADCAST,
        title: params.title,
        body: params.body,
      },
    });
    result.inApp = true;
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
        subject: params.title,
        text: params.body,
        html: params.body.replace(/\n/g, "<br>"),
      });
      result.email = true;
    } catch (error) {
      console.error(`[missing-reminder:email:${params.userId}]`, error);
      result.skipped = true;
    }
    return result;
  }

  if (params.channel === "inApp") {
    await prisma.userNotification.create({
      data: {
        userId: params.userId,
        kind: UserNotificationKind.PLATFORM_BROADCAST,
        title: params.title,
        body: params.body,
      },
    });
    result.inApp = true;
    return result;
  }

  // everywhere
  if (linked && isTelegramConfigured()) {
    try {
      await sendTelegramMessage(
        params.telegramChatId!,
        appendTelegramChannelFooter(params.body),
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
        subject: params.title,
        text: params.body,
        html: params.body.replace(/\n/g, "<br>"),
      });
      result.email = true;
    } catch (error) {
      console.error(`[missing-reminder:email:${params.userId}]`, error);
    }
  }

  await prisma.userNotification.create({
    data: {
      userId: params.userId,
      kind: UserNotificationKind.PLATFORM_BROADCAST,
      title: params.title,
      body: params.body,
    },
  });
  result.inApp = true;

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
      email: true,
      emailVerifiedAt: true,
      telegramChatId: true,
    },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const body = buildMissingPredictionReminderText({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    startsAt: match.startsAt,
    inviteCode: params.inviteCode,
  });
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

    const delivered = await deliverToUser({
      userId: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      telegramChatId: user.telegramChatId,
      channel: params.channel,
      title,
      body,
    });

    if (delivered.inApp) totals.inApp++;
    if (delivered.email) totals.email++;
    if (delivered.telegram) totals.telegram++;
    if (delivered.skipped) totals.skipped++;
  }

  return totals;
}
