import { PredictionReminderKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { logOperationError, maskEmail } from "@/lib/logger";
import {
  buildNightBatchEmailContent,
  buildNightBatchInAppBody,
  buildNightBatchTelegramPersonalHtml,
} from "@/lib/prediction-reminder-content";
import {
  getNightReminderFireAt,
  isNightReminderDue,
  isNightWindowKickoffMsk,
} from "@/lib/reminders/night-match-schedule";
import { preMatchReminderEligibleStatusFilter } from "@/lib/reminders/match-reminder-schedule";
import { deliverMatchReminderToUser } from "@/lib/reminders/reminder-delivery";
import type { ReminderEmailBatch } from "@/lib/reminders/reminder-email-batch";
import type { ReminderRunResult } from "@/lib/reminders/prediction-reminders";

const NIGHT_KIND = PredictionReminderKind.H18_NIGHT;

type NightMatchRow = {
  id: string;
  startsAt: Date;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  tournament: {
    games: Array<{
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
          notifyByEmail: boolean;
          notifyByTelegram: boolean;
          notifyInApp: boolean;
        };
      }>;
    }>;
  };
};

function nightReminderKey(gameId: string, matchId: string, userId: string) {
  return `${gameId}:${matchId}:${userId}:${NIGHT_KIND}`;
}

export async function sendNightBatchPredictionReminders(
  now = new Date(),
  emailBatch?: ReminderEmailBatch,
): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  const horizon = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: {
      status: preMatchReminderEligibleStatusFilter(),
      startsAt: { gt: now, lte: horizon },
    },
    include: {
      homeTeam: { select: { name: true, countryCode: true, externalId: true } },
      awayTeam: { select: { name: true, countryCode: true, externalId: true } },
      tournament: {
        include: {
          games: {
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
                      notifyByEmail: true,
                      notifyByTelegram: true,
                      notifyInApp: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const dueMatches = matches.filter((match) => {
    if (!isMatchPredictable(match)) return false;
    if (!isNightWindowKickoffMsk(match.startsAt)) return false;
    const fireAt = getNightReminderFireAt(match.startsAt);
    return fireAt != null && isNightReminderDue(fireAt, now, match.startsAt);
  }) as NightMatchRow[];

  if (dueMatches.length === 0) return result;

  const gameIds = new Set<string>();
  const matchIds = dueMatches.map((m) => m.id);
  for (const match of dueMatches) {
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

  const sentReminders = await prisma.predictionReminder.findMany({
    where: {
      gameId: { in: [...gameIds] },
      matchId: { in: matchIds },
      kind: NIGHT_KIND,
    },
    select: { gameId: true, matchId: true, userId: true },
  });
  const alreadySent = new Set(
    sentReminders.map((r) =>
      nightReminderKey(r.gameId, r.matchId, r.userId),
    ),
  );

  type BatchKey = string;
  const batches = new Map<
    BatchKey,
    {
      game: NightMatchRow["tournament"]["games"][number];
      user: NightMatchRow["tournament"]["games"][number]["participants"][number]["user"];
      displayName: string;
      matches: NightMatchRow[];
    }
  >();

  for (const match of dueMatches) {
    for (const game of match.tournament.games) {
      for (const participant of game.participants) {
        result.checked++;
        const predKey = `${game.id}:${match.id}:${participant.userId}`;
        if (predictedKeys.has(predKey)) {
          result.skipped++;
          continue;
        }
        const sentKey = nightReminderKey(
          game.id,
          match.id,
          participant.userId,
        );
        if (alreadySent.has(sentKey)) {
          result.skipped++;
          continue;
        }

        const batchKey = `${game.id}:${participant.userId}`;
        const existing = batches.get(batchKey);
        if (existing) {
          existing.matches.push(match);
        } else {
          batches.set(batchKey, {
            game,
            user: participant.user,
            displayName: participant.displayName,
            matches: [match],
          });
        }
      }
    }
  }

  for (const batch of batches.values()) {
    batch.matches.sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    );

    const matchBlocks = batch.matches.map((match) => ({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startsAt: match.startsAt,
    }));

    const title =
      batch.matches.length === 1
        ? `Прогноз: ${batch.matches[0]!.homeTeam.name} — ${batch.matches[0]!.awayTeam.name}`
        : `Прогноз: ${batch.matches.length} предстоящих матча`;

    const inAppBody = buildNightBatchInAppBody({
      gameTitle: batch.game.title,
      matches: matchBlocks,
    });
    const telegramHtml = buildNightBatchTelegramPersonalHtml({
      gameTitle: batch.game.title,
      matches: matchBlocks,
      inviteCode: batch.game.inviteCode,
    });
    const emailContent = buildNightBatchEmailContent({
      userName: batch.displayName,
      gameTitle: batch.game.title,
      matches: matchBlocks,
      inviteCode: batch.game.inviteCode,
    });

    try {
      const delivered = await deliverMatchReminderToUser({
        userId: batch.user.id,
        userName: batch.displayName,
        email: batch.user.email,
        emailVerifiedAt: batch.user.emailVerifiedAt,
        telegramChatId: batch.user.telegramChatId,
        notifyByEmail: batch.user.notifyByEmail,
        notifyByTelegram: batch.user.notifyByTelegram,
        notifyInApp: batch.user.notifyInApp,
        title,
        inAppBody,
        inviteCode: batch.game.inviteCode,
        emailSubject: title,
        emailText: emailContent.text,
        emailHtml: emailContent.html,
        emailSection: {
          type: "night_missing",
          gameTitle: batch.game.title,
          inviteCode: batch.game.inviteCode,
          matches: matchBlocks,
        },
        emailBatch,
        telegramHtml,
        logTag: "reminders:night-batch",
      });

      if (!delivered.anyDelivered) {
        result.skipped++;
        continue;
      }

      for (const match of batch.matches) {
        await prisma.predictionReminder.create({
          data: {
            gameId: batch.game.id,
            matchId: match.id,
            userId: batch.user.id,
            kind: NIGHT_KIND,
          },
        });
        alreadySent.add(
          nightReminderKey(batch.game.id, match.id, batch.user.id),
        );
      }

      result.sent++;
    } catch (error) {
      logOperationError("reminders:night-batch", error, {
        gameId: batch.game.id,
        userId: batch.user.id,
        email: maskEmail(batch.user.email),
      });
      result.errors++;
    }
  }

  return result;
}
