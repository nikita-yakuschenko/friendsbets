import {
  MatchStatus,
  PredictionReminderKind,
  UserNotificationKind,
} from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/create-user-notification";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { logOperationError, maskEmail } from "@/lib/logger";
import {
  buildOpeningH24EmailContent,
  buildOpeningH24InAppBody,
  buildOpeningH24TelegramHtml,
  OPENING_H24_TITLE,
  openingH24EmailSubject,
} from "@/lib/reminders/opening-match-h24-content";
import { matchReminderWindow } from "@/lib/reminders/prediction-reminders";
import type { ReminderRunResult } from "@/lib/reminders/prediction-reminders";
import { findOpeningMatchForTournament } from "@/lib/tournament-opening-reminder";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";

export const OPENING_H24_MINUTES_BEFORE = 24 * 60;
const REMINDER_KIND = PredictionReminderKind.H24_OPENING;

type OpeningH24Game = {
  id: string;
  title: string;
  inviteCode: string;
  participants: Array<{
    userId: string;
    displayName: string;
    user: {
      id: string;
      email: string;
      name: string;
      emailVerifiedAt: Date | null;
      telegramChatId: bigint | null;
    };
  }>;
};

type OpeningH24MatchRow = {
  id: string;
  tournamentId: string;
  startsAt: Date;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  tournament: { games: OpeningH24Game[] };
};

function reminderKey(gameId: string, matchId: string, userId: string) {
  return `${gameId}:${matchId}:${userId}:${REMINDER_KIND}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

/** Заявка на отправку до TG/email — защита от гонки cron. */
async function claimOpeningH24Reminder(
  gameId: string,
  matchId: string,
  userId: string,
): Promise<boolean> {
  try {
    await prisma.predictionReminder.create({
      data: {
        gameId,
        matchId,
        userId,
        kind: REMINDER_KIND,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) return false;
    throw error;
  }
}

async function loadOpeningMatchesDueH24(
  now: Date,
): Promise<OpeningH24MatchRow[]> {
  const startsAtWindow = matchReminderWindow(OPENING_H24_MINUTES_BEFORE, now);

  const candidates = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      startsAt: startsAtWindow,
    },
    include: {
      homeTeam: { select: { name: true, countryCode: true, externalId: true } },
      awayTeam: { select: { name: true, countryCode: true, externalId: true } },
    },
  });

  const due: OpeningH24MatchRow[] = [];

  for (const candidate of candidates) {
    if (!isMatchPredictable(candidate)) continue;

    const opening = await findOpeningMatchForTournament(
      candidate.tournamentId,
      now,
    );
    if (!opening || opening.id !== candidate.id) continue;

    const games = await prisma.game.findMany({
      where: { tournamentId: candidate.tournamentId },
      select: {
        id: true,
        title: true,
        inviteCode: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                emailVerifiedAt: true,
                telegramChatId: true,
              },
            },
          },
        },
      },
    });

    if (games.length === 0) continue;

    due.push({
      id: candidate.id,
      tournamentId: candidate.tournamentId,
      startsAt: candidate.startsAt,
      homeTeam: candidate.homeTeam,
      awayTeam: candidate.awayTeam,
      tournament: { games },
    });
  }

  return due;
}

/** За 24 ч до матча открытия — всем участникам (с прогнозом и без). */
export async function sendOpeningMatchH24Reminders(
  now = new Date(),
): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  const matches = await loadOpeningMatchesDueH24(now);
  if (matches.length === 0) return result;

  const gameIds = new Set<string>();
  const matchIds = matches.map((match) => match.id);
  for (const match of matches) {
    for (const game of match.tournament.games) {
      gameIds.add(game.id);
    }
  }

  const predictions = await prisma.prediction.findMany({
    where: {
      gameId: { in: [...gameIds] },
      matchId: { in: matchIds },
    },
    select: { gameId: true, matchId: true, userId: true },
  });
  const predictedKeys = new Set(
    predictions.map((p) => `${p.gameId}:${p.matchId}:${p.userId}`),
  );

  for (const match of matches) {
    for (const game of match.tournament.games) {
      for (const participant of game.participants) {
        result.checked++;

        const hasPrediction = predictedKeys.has(
          `${game.id}:${match.id}:${participant.userId}`,
        );

        const claimed = await claimOpeningH24Reminder(
          game.id,
          match.id,
          participant.userId,
        );
        if (!claimed) {
          result.skipped++;
          continue;
        }

        const displayName = participant.displayName || participant.user.name;
        const payload = {
          gameTitle: game.title,
          inviteCode: game.inviteCode,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          startsAt: match.startsAt,
          hasPrediction,
        };

        const inAppBody = buildOpeningH24InAppBody(payload);
        const telegramHtml = buildOpeningH24TelegramHtml(payload);
        const emailContent = buildOpeningH24EmailContent({
          ...payload,
          userName: displayName,
        });

        try {
          await createUserNotification({
            userId: participant.userId,
            kind: UserNotificationKind.MISSING_PREDICTION,
            title: OPENING_H24_TITLE,
            body: inAppBody,
            actionInviteCode: game.inviteCode,
          });

          if (participant.user.telegramChatId && isTelegramConfigured()) {
            await sendTelegramMessage(
              participant.user.telegramChatId,
              appendTelegramChannelFooter(telegramHtml),
              { parseMode: "HTML" },
            );
          }

          if (participant.user.emailVerifiedAt) {
            await sendEmail({
              to: participant.user.email,
              subject: openingH24EmailSubject(
                match.homeTeam.name,
                match.awayTeam.name,
              ),
              text: emailContent.text,
              html: emailContent.html,
            });
          }

          result.sent++;
        } catch (error) {
          await prisma.predictionReminder
            .deleteMany({
              where: {
                gameId: game.id,
                matchId: match.id,
                userId: participant.userId,
                kind: REMINDER_KIND,
              },
            })
            .catch(() => undefined);

          logOperationError("reminders:opening-h24", error, {
            gameId: game.id,
            matchId: match.id,
            userId: participant.userId,
            email: maskEmail(participant.user.email),
            key: reminderKey(game.id, match.id, participant.userId),
          });
          result.errors++;
        }
      }
    }
  }

  return result;
}
