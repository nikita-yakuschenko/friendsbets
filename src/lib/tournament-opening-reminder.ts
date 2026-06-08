import { MatchStatus, UserNotificationKind } from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/create-user-notification";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import {
  buildMissingPredictionEmailContent,
  buildOpeningMatchInAppBody,
  buildOpeningMatchTelegramPersonalHtml,
} from "@/lib/prediction-reminder-content";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";
import { formatRelativeTime } from "@/lib/utils";

/** Ближайший предсказуемый матч турнира (матч открытия). */
export async function findOpeningMatchForGame(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, title: true, inviteCode: true, tournamentId: true },
  });
  if (!game) return null;

  const matches = await prisma.match.findMany({
    where: {
      tournamentId: game.tournamentId,
      startsAt: { gt: new Date() },
      status: MatchStatus.SCHEDULED,
    },
    include: {
      homeTeam: {
        select: { name: true, countryCode: true, externalId: true },
      },
      awayTeam: {
        select: { name: true, countryCode: true, externalId: true },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 30,
  });

  const match = matches.find(isMatchPredictable);
  if (!match) return null;

  return { game, match };
}

/** Напоминание о матче открытия сразу после вступления в турнир. */
export async function notifyOpeningMatchOnTournamentJoin(
  userId: string,
  gameId: string,
): Promise<void> {
  try {
    const ctx = await findOpeningMatchForGame(gameId);
    if (!ctx) return;

    const { game, match } = ctx;

    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        gameId_matchId_userId: {
          gameId: game.id,
          matchId: match.id,
          userId,
        },
      },
      select: { id: true },
    });
    if (existingPrediction) return;

    const [user, participant] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          emailVerifiedAt: true,
          telegramChatId: true,
        },
      }),
      prisma.gameParticipant.findUnique({
        where: { gameId_userId: { gameId: game.id, userId } },
        select: { displayName: true },
      }),
    ]);
    if (!user || !participant) return;

    const displayName = participant.displayName || user.name;
    const title = `Добро пожаловать в «${game.title}»`;
    const inAppBody = buildOpeningMatchInAppBody({
      gameTitle: game.title,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startsAt: match.startsAt,
    });
    const telegramHtml = buildOpeningMatchTelegramPersonalHtml({
      gameTitle: game.title,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startsAt: match.startsAt,
      inviteCode: game.inviteCode,
    });
    const emailContent = buildMissingPredictionEmailContent({
      userName: displayName,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      gameTitle: game.title,
      startsAt: match.startsAt,
      inviteCode: game.inviteCode,
      timeLabel: formatRelativeTime(new Date(match.startsAt)),
    });

    await createUserNotification({
      userId,
      kind: UserNotificationKind.MISSING_PREDICTION,
      title,
      body: inAppBody,
      actionInviteCode: game.inviteCode,
    });

    if (user.telegramChatId && isTelegramConfigured()) {
      try {
        await sendTelegramMessage(
          user.telegramChatId,
          appendTelegramChannelFooter(telegramHtml),
          { parseMode: "HTML" },
        );
      } catch (error) {
        console.error(`[opening-reminder:telegram:${userId}]`, error);
      }
    }

    if (user.emailVerifiedAt) {
      try {
        await sendEmail({
          to: user.email,
          subject: `FriendsBets: матч открытия — ${match.homeTeam.name} — ${match.awayTeam.name}`,
          text: `${title}\n\n${inAppBody}\n\n${emailContent.text}`,
          html: emailContent.html,
        });
      } catch (error) {
        console.error(`[opening-reminder:email:${userId}]`, error);
      }
    }
  } catch (error) {
    console.error("[opening-reminder]", error);
  }
}
