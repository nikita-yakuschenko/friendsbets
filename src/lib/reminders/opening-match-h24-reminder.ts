import {
  MatchStatus,
  PredictionReminderKind,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { logOperationError, maskEmail } from "@/lib/logger";
import {
  buildOpeningH24EmailContent,
  buildOpeningH24InAppBody,
  buildOpeningH24TelegramHtml,
  OPENING_H24_TITLE,
  openingH24EmailSubject,
} from "@/lib/reminders/opening-match-h24-content";
import {
  getOpeningH24FireAt,
  isOpeningH24Due,
} from "@/lib/reminders/opening-match-h24-schedule";
import type { ReminderRunResult } from "@/lib/reminders/prediction-reminders";
import { deliverMatchReminderToUser } from "@/lib/reminders/reminder-delivery";
import { findOpeningMatchForTournament } from "@/lib/tournament-opening-reminder";

export {
  getOpeningH24FireAt,
  isOpeningH24Due,
} from "@/lib/reminders/opening-match-h24-schedule";

const REMINDER_KIND = PredictionReminderKind.H24_OPENING;
const LOOKAHEAD_MS = 8 * 24 * 60 * 60 * 1000;

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

async function claimOpeningH24Reminder(
  gameId: string,
  matchId: string,
  userId: string,
): Promise<boolean> {
  try {
    await prisma.predictionReminder.create({
      data: { gameId, matchId, userId, kind: REMINDER_KIND },
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
  const candidates = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      startsAt: {
        gt: now,
        lte: new Date(now.getTime() + LOOKAHEAD_MS),
      },
    },
    include: {
      homeTeam: { select: { name: true, countryCode: true, externalId: true } },
      awayTeam: { select: { name: true, countryCode: true, externalId: true } },
    },
  });

  const due: OpeningH24MatchRow[] = [];

  for (const candidate of candidates) {
    if (!isMatchPredictable(candidate)) continue;
    if (!isOpeningH24Due(now, candidate.startsAt)) continue;

    const opening = await findOpeningMatchForTournament(candidate.tournamentId);
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

export async function getNearestOpeningH24FireAt(
  now: Date,
): Promise<Date | null> {
  const candidates = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      startsAt: { gt: now, lte: new Date(now.getTime() + LOOKAHEAD_MS) },
    },
    select: {
      id: true,
      tournamentId: true,
      startsAt: true,
      homeTeam: { select: { externalId: true } },
      awayTeam: { select: { externalId: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 80,
  });

  let nearest: Date | null = null;

  for (const candidate of candidates) {
    if (!isMatchPredictable(candidate)) continue;

    const opening = await findOpeningMatchForTournament(candidate.tournamentId);
    if (!opening || opening.id !== candidate.id) continue;

    const fireAt = getOpeningH24FireAt(candidate.startsAt);
    if (fireAt <= now) return now;
    if (!nearest || fireAt < nearest) nearest = fireAt;
  }

  return nearest;
}

/** Стартовое уведомление: 22:35 МСК в канун дня матча открытия. */
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
          const delivered = await deliverMatchReminderToUser({
            userId: participant.userId,
            email: participant.user.email,
            emailVerifiedAt: participant.user.emailVerifiedAt,
            telegramChatId: participant.user.telegramChatId,
            title: OPENING_H24_TITLE,
            inAppBody,
            inviteCode: game.inviteCode,
            emailSubject: openingH24EmailSubject(
              match.homeTeam.name,
              match.awayTeam.name,
            ),
            emailText: emailContent.text,
            emailHtml: emailContent.html,
            telegramHtml,
            logTag: "reminders:opening-h24",
          });

          if (!delivered.anyDelivered) {
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
            result.skipped++;
            continue;
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
