import {
  MatchStatus,
  PredictionReminderKind,
  UserNotificationKind,
} from "@/generated/prisma/client";
import { createUserNotification } from "@/lib/create-user-notification";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
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

  if (games.length === 0) return result;

  const gameIds = games.map((game) => game.id);
  const now = new Date();
  const upcomingMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: MatchStatus.SCHEDULED,
      startsAt: { gt: now },
    },
    include: {
      homeTeam: { select: { name: true, countryCode: true, externalId: true } },
      awayTeam: { select: { name: true, countryCode: true, externalId: true } },
    },
    orderBy: { startsAt: "asc" },
  });
  const nextMatch = upcomingMatches.find((row) => isMatchPredictable(row)) ?? null;

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
          ? calculatePredictionScore(prediction, match, game.scoringRule)
          : { points: 0, reason: "Прогноз не сделан", tier: "none" as const };

      const payload = {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
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

      try {
        await createUserNotification({
          userId: participant.userId,
          kind: UserNotificationKind.MATCH_RESULT,
          title,
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
            subject: `FriendsBets: ${title}`,
            text: emailContent.text,
            html: emailContent.html,
          });
        }

        alreadySent.add(key);
        result.sent++;
      } catch (error) {
        try {
          await prisma.predictionReminder.delete({
            where: {
              gameId_matchId_userId_kind: {
                gameId: game.id,
                matchId,
                userId: participant.userId,
                kind: NOTIFY_KIND,
              },
            },
          });
        } catch {
          /* слот уже снят или занят другим воркером */
        }
        logOperationError("match-result:notify", error, {
          gameId: game.id,
          matchId,
          userId: participant.userId,
          email: maskEmail(participant.user.email),
        });
        result.errors++;
      }
    }
  }

  return result;
}
