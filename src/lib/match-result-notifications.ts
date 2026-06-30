import {
  MatchStatus,
  PredictionReminderKind,
  UserNotificationKind,
} from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/create-user-notification";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { findNextNotStartedMatch } from "@/lib/football-api/match-visibility";
import { computeGameLeaderboard } from "@/lib/leaderboard/compute-game-leaderboard";
import { logOperationError, maskEmail } from "@/lib/logger";
import {
  buildMatchResultEmailContent,
  buildMatchResultInAppBody,
  buildMatchResultTelegramHtml,
  buildMatchResultTitle,
} from "@/lib/match-result-notification-content";
import { calculatePredictionScore } from "@/lib/scoring";
import { recalculateMatchScoresForTournament } from "@/lib/template-match-admin";
import {
  shouldNotifyByEmail,
  shouldNotifyByTelegram,
  shouldNotifyInApp,
} from "@/lib/notification-preferences";
import { appendTelegramChannelFooter } from "@/lib/telegram/format";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { isTelegramConfigured } from "@/lib/telegram/config";

const NOTIFY_KIND = PredictionReminderKind.MATCH_FINISHED;

function reminderKey(gameId: string, matchId: string, userId: string) {
  return `${gameId}:${matchId}:${userId}:${NOTIFY_KIND}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

/** Атомарно «занимает» слот отправки до рассылки — защита от параллельных синков. */
async function claimMatchFinishedReminder(
  gameId: string,
  matchId: string,
  userId: string,
): Promise<boolean> {
  try {
    await prisma.predictionReminder.create({
      data: { gameId, matchId, userId, kind: NOTIFY_KIND },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) return false;
    throw error;
  }
}

/** Пересчёт очков и рассылка участникам (один раз на матч). */
export async function handleMatchFinished(
  tournamentId: string,
  matchId: string,
): Promise<void> {
  await recalculateMatchScoresForTournament(tournamentId, matchId);
  await notifyMatchResultParticipants(tournamentId, matchId);
}

export async function notifyMatchResultParticipants(
  tournamentId: string,
  matchId: string,
): Promise<{ sent: number; skipped: number; errors: number }> {
  const result = { sent: 0, skipped: 0, errors: 0 };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { name: true, countryCode: true } },
      awayTeam: { select: { name: true, countryCode: true } },
    },
  });

  if (
    !match ||
    match.tournamentId !== tournamentId ||
    match.status !== MatchStatus.FINISHED ||
    match.homeScore === null ||
    match.awayScore === null
  ) {
    return result;
  }

  const games = await prisma.game.findMany({
    where: { tournamentId },
    select: {
      id: true,
      title: true,
      inviteCode: true,
      scoringRule: true,
      penaltyScoringSynthetic: true,
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              emailVerifiedAt: true,
              telegramChatId: true,
              notifyByEmail: true,
              notifyByTelegram: true,
              notifyInApp: true,
            },
          },
        },
      },
    },
  });

  if (games.length === 0) return result;

  const gameIds = games.map((game) => game.id);
  const now = new Date();
  const candidateMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
    },
    include: {
      homeTeam: { select: { name: true, countryCode: true, externalId: true } },
      awayTeam: { select: { name: true, countryCode: true, externalId: true } },
    },
    orderBy: { startsAt: "asc" },
  });
  const nextMatch = findNextNotStartedMatch(candidateMatches, now) ?? null;

  const predictions = await prisma.prediction.findMany({
    where: { gameId: { in: gameIds }, matchId },
    select: {
      gameId: true,
      userId: true,
      homeScore: true,
      awayScore: true,
    },
  });
  const predictionByGameUser = new Map(
    predictions.map((p) => [`${p.gameId}:${p.userId}`, p]),
  );

  const nextPredictions =
    nextMatch == null
      ? []
      : await prisma.prediction.findMany({
          where: {
            gameId: { in: gameIds },
            matchId: nextMatch.id,
          },
          select: { gameId: true, userId: true },
        });
  const nextPredictionKeys = new Set(
    nextPredictions.map((p) => `${p.gameId}:${p.userId}`),
  );

  const sentReminders = await prisma.predictionReminder.findMany({
    where: { gameId: { in: gameIds }, matchId, kind: NOTIFY_KIND },
    select: { gameId: true, userId: true },
  });
  const alreadySent = new Set(
    sentReminders.map((r) => reminderKey(r.gameId, matchId, r.userId)),
  );

  const title = buildMatchResultTitle({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homePenaltyScore: match.homePenaltyScore,
    awayPenaltyScore: match.awayPenaltyScore,
  });

  for (const game of games) {
    const leaderboard = await computeGameLeaderboard(game.id);
    const participantsCount = leaderboard.length;

    for (const participant of game.participants) {
      const key = reminderKey(game.id, matchId, participant.userId);
      if (alreadySent.has(key)) {
        result.skipped++;
        continue;
      }

      const boardRow = leaderboard.find(
        (row) => row.userId === participant.userId,
      );
      if (!boardRow) {
        result.skipped++;
        continue;
      }

      const claimed = await claimMatchFinishedReminder(
        game.id,
        matchId,
        participant.userId,
      );
      if (!claimed) {
        result.skipped++;
        alreadySent.add(key);
        continue;
      }

      const prediction = predictionByGameUser.get(
        `${game.id}:${participant.userId}`,
      );
      const scoreResult =
        prediction != null
          ? calculatePredictionScore(prediction, match, game.scoringRule, {
              penaltyScoringSynthetic: game.penaltyScoringSynthetic,
            })
          : { points: 0, reason: "Прогноз не сделан", tier: "none" as const };

      const payload = {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homePenaltyScore: match.homePenaltyScore,
        awayPenaltyScore: match.awayPenaltyScore,
        gameTitle: game.title,
        inviteCode: game.inviteCode,
        predictedHome: prediction?.homeScore ?? null,
        predictedAway: prediction?.awayScore ?? null,
        matchPoints: scoreResult.points,
        matchPointsReason: scoreResult.reason,
        rank: boardRow.rank,
        participantsCount,
        totalPoints: boardRow.totalPoints,
        nextMatch: nextMatch
          ? {
              homeTeam: nextMatch.homeTeam,
              awayTeam: nextMatch.awayTeam,
              startsAt: nextMatch.startsAt,
              hasPrediction: nextPredictionKeys.has(
                `${game.id}:${participant.userId}`,
              ),
            }
          : null,
      };

      const displayName = participant.displayName || participant.user.name;
      const inAppBody = buildMatchResultInAppBody(payload);
      const telegramHtml = buildMatchResultTelegramHtml(payload);
      const emailContent = buildMatchResultEmailContent({
        ...payload,
        userName: displayName,
      });

      // Слот уже занят (claim создан) — это значит «уже обработали».
      // Каналы шлём независимо и НИКОГДА не снимаем claim из-за ошибки канала,
      // иначе следующий цикл синка повторно разошлёт уведомление (спам дублей).
      const user = participant.user;
      const prefs = {
        notifyByEmail: user.notifyByEmail,
        notifyByTelegram: user.notifyByTelegram,
        notifyInApp: user.notifyInApp,
        emailVerifiedAt: user.emailVerifiedAt,
        telegramChatId: user.telegramChatId,
      };

      alreadySent.add(key);
      let delivered = false;

      if (shouldNotifyInApp(prefs)) {
        try {
          await createUserNotification({
            userId: participant.userId,
            kind: UserNotificationKind.MATCH_RESULT,
            title,
            body: inAppBody,
            actionInviteCode: game.inviteCode,
          });
          delivered = true;
        } catch (error) {
          logOperationError("match-result:notify:in-app", error, {
            gameId: game.id,
            matchId,
            userId: participant.userId,
          });
        }
      }

      if (shouldNotifyByTelegram(prefs) && isTelegramConfigured()) {
        try {
          await sendTelegramMessage(
            user.telegramChatId!,
            appendTelegramChannelFooter(telegramHtml),
            { parseMode: "HTML" },
          );
          delivered = true;
        } catch (error) {
          logOperationError("match-result:notify:telegram", error, {
            gameId: game.id,
            matchId,
            userId: participant.userId,
          });
        }
      }

      if (shouldNotifyByEmail(prefs)) {
        try {
          await sendEmail({
            to: user.email,
            subject: `FriendsBets: ${title}`,
            text: emailContent.text,
            html: emailContent.html,
          });
          delivered = true;
        } catch (error) {
          logOperationError("match-result:notify:email", error, {
            gameId: game.id,
            matchId,
            userId: participant.userId,
            email: maskEmail(participant.user.email),
          });
        }
      }

      if (delivered) {
        result.sent++;
      } else {
        result.skipped++;
      }
    }
  }

  return result;
}
