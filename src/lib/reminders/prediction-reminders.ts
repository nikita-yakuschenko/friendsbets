import {
  GameParticipantRole,
  MatchStatus,
  PredictionReminderKind,
} from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import { postTelegramChannelNews } from "@/lib/telegram/channel";
import {
  buildChannelMatchReminderText,
  buildChannelMatchStartedText,
  buildMatchStartedTelegramText,
  buildMissingPredictionTelegramText,
} from "@/lib/telegram/reminder-messages";
import { isTelegramConfigured } from "@/lib/telegram/config";
import {
  buildAdminMissingPredictionsEmail,
  buildPredictionReminderEmail,
} from "@/lib/email/templates";
import {
  buildMatchStartedEmailContent,
  buildMatchStartedInAppBody,
  buildMissingPredictionInAppBody,
} from "@/lib/prediction-reminder-content";
import {
  isMatchReminderDue,
  liveReminderCandidateStartsAtRange,
  MATCH_REMINDER_SCHEDULE,
  preMatchReminderCandidateStartsAtRange,
} from "@/lib/reminders/match-reminder-schedule";
import { deliverMatchReminderToUser } from "@/lib/reminders/reminder-delivery";
import { getAppOriginFromEnv } from "@/lib/app-origin";
import { gamePath } from "@/lib/game-path";
import { logOperation, logOperationError, maskEmail } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { sendNightBatchPredictionReminders } from "@/lib/reminders/night-match-reminders";
import { sendOpeningMatchH24Reminders } from "@/lib/reminders/opening-match-h24-reminder";
import { formatDateTime } from "@/lib/utils";

/** @deprecated Используйте MATCH_REMINDER_SCHEDULE */
export const REMINDER_SCHEDULE = MATCH_REMINDER_SCHEDULE;

export type ReminderRunResult = {
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
};

type GameWithParticipants = {
  id: string;
  title: string;
  inviteCode: string;
  createdById: string;
  createdBy: {
    id: string;
    email: string;
    name: string;
    emailVerifiedAt: Date | null;
  };
  participants: Array<{
    userId: string;
    displayName: string;
    role: GameParticipantRole;
    user: {
      id: string;
      email: string;
      name: string;
      emailVerifiedAt: Date | null;
      telegramChatId: bigint | null;
    };
  }>;
};

type ReminderMatchRow = {
  id: string;
  startsAt: Date;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  tournament: { games: GameWithParticipants[] };
};

function appOrigin(origin?: string): string {
  return (origin ?? getAppOriginFromEnv()).replace(/\/$/, "");
}

function predictionsUrl(inviteCode: string, origin?: string): string {
  return `${appOrigin(origin)}${gamePath(inviteCode, "predictions")}`;
}

function missingUrl(inviteCode: string, origin?: string): string {
  return `${appOrigin(origin)}/admin/missing?game=${encodeURIComponent(inviteCode)}`;
}

export function getAdminRecipients(game: GameWithParticipants) {
  const recipients = new Map<string, { email: string; name: string }>();

  for (const participant of game.participants) {
    if (
      participant.role === GameParticipantRole.ORGANIZER &&
      participant.user.emailVerifiedAt
    ) {
      recipients.set(participant.userId, {
        email: participant.user.email,
        name: participant.displayName,
      });
    }
  }

  if (
    !recipients.has(game.createdById) &&
    game.createdBy.emailVerifiedAt
  ) {
    recipients.set(game.createdById, {
      email: game.createdBy.email,
      name: game.createdBy.name,
    });
  }

  return [...recipients.entries()].map(([userId, info]) => ({ userId, ...info }));
}

function reminderKey(
  gameId: string,
  matchId: string,
  userId: string,
  kind: PredictionReminderKind,
) {
  return `${gameId}:${matchId}:${userId}:${kind}`;
}

function buildPreMatchReminderEmail(params: {
  userName: string;
  gameTitle: string;
  gameInviteCode: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  timeLabel: string;
}) {
  const link = predictionsUrl(params.gameInviteCode);
  const subject = `FriendsBets: прогноз через ${params.timeLabel} — ${params.homeTeam} — ${params.awayTeam}`;
  const { text, html } = buildPredictionReminderEmail({
    userName: params.userName,
    homeTeam: params.homeTeam,
    awayTeam: params.awayTeam,
    gameTitle: params.gameTitle,
    startsAtLabel: formatDateTime(params.startsAt),
    timeLabel: params.timeLabel,
    link,
  });

  return { subject, text, html };
}

async function sendAdminMissingListEmail(params: {
  to: string;
  adminName: string;
  gameTitle: string;
  gameInviteCode: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  timeLabel: string;
  missingNames: string[];
}) {
  const link = missingUrl(params.gameInviteCode);
  const subject = `FriendsBets: кто не поставил (через ${params.timeLabel}) — ${params.homeTeam} — ${params.awayTeam}`;
  const { text, html } = buildAdminMissingPredictionsEmail({
    adminName: params.adminName,
    homeTeam: params.homeTeam,
    awayTeam: params.awayTeam,
    gameTitle: params.gameTitle,
    startsAtLabel: formatDateTime(params.startsAt),
    timeLabel: params.timeLabel,
    missingNames: params.missingNames,
    link,
  });

  await sendEmail({ to: params.to, subject, text, html });
}

async function processReminderBatch(params: {
  matches: ReminderMatchRow[];
  kind: PredictionReminderKind;
  adminKind: PredictionReminderKind;
  label: string;
  matchStarted: boolean;
  result: ReminderRunResult;
}) {
  const { matches, kind, adminKind, label, matchStarted, result } = params;
  const telegramEnabled = isTelegramConfigured();
  if (matches.length === 0) return;

  const gameIds = new Set<string>();
  const matchIds = new Set<string>();
  for (const match of matches) {
    matchIds.add(match.id);
    for (const game of match.tournament.games) {
      gameIds.add(game.id);
    }
  }

  const predictions = await prisma.prediction.findMany({
    where: {
      gameId: { in: [...gameIds] },
      matchId: { in: [...matchIds] },
    },
    select: {
      gameId: true,
      matchId: true,
      userId: true,
      homeScore: true,
      awayScore: true,
    },
  });

  const predictedKeys = new Set(
    predictions.map((p) => `${p.gameId}:${p.matchId}:${p.userId}`),
  );

  const sentReminders = await prisma.predictionReminder.findMany({
    where: {
      gameId: { in: [...gameIds] },
      matchId: { in: [...matchIds] },
      kind: { in: [kind, adminKind] },
    },
    select: { gameId: true, matchId: true, userId: true, kind: true },
  });

  const alreadySent = new Set(
    sentReminders.map((r) =>
      reminderKey(r.gameId, r.matchId, r.userId, r.kind),
    ),
  );

  for (const match of matches) {
    const gameTitles = [
      ...new Set(match.tournament.games.map((game) => game.title)),
    ];

    if (telegramEnabled) {
      const channelText = matchStarted
        ? buildChannelMatchStartedText({
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            gameTitles,
          })
        : buildChannelMatchReminderText({
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            timeLabel: label,
            gameTitles,
          });
      postTelegramChannelNews(channelText);
    }

    for (const game of match.tournament.games) {
      const missingParticipants = game.participants.filter(
        (participant) =>
          !predictedKeys.has(
            `${game.id}:${match.id}:${participant.userId}`,
          ),
      );

      const participantsToNotify = matchStarted
        ? game.participants
        : missingParticipants;

      for (const participant of participantsToNotify) {
        result.checked++;
        const key = reminderKey(game.id, match.id, participant.userId, kind);

        if (alreadySent.has(key)) {
          result.skipped++;
          continue;
        }

        const isMissing = missingParticipants.some(
          (p) => p.userId === participant.userId,
        );

        if (!matchStarted && !isMissing) continue;

        const prediction = predictions.find(
          (p) =>
            p.gameId === game.id &&
            p.matchId === match.id &&
            p.userId === participant.userId,
        );

        const matchTitle = `${match.homeTeam.name} — ${match.awayTeam.name}`;
        let title: string;
        let inAppBody: string;
        let telegramHtml: string;
        let emailSubject: string;
        let emailText: string;
        let emailHtml: string;

        if (matchStarted) {
          title = `Матч начался: ${matchTitle}`;
          inAppBody = buildMatchStartedInAppBody({
            gameTitle: game.title,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            predictedHome: prediction?.homeScore ?? null,
            predictedAway: prediction?.awayScore ?? null,
          });
          telegramHtml = buildMatchStartedTelegramText({
            gameTitle: game.title,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            inviteCode: game.inviteCode,
            predictedHome: prediction?.homeScore ?? null,
            predictedAway: prediction?.awayScore ?? null,
          });
          const emailContent = buildMatchStartedEmailContent({
            userName: participant.displayName,
            gameTitle: game.title,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            inviteCode: game.inviteCode,
            predictedHome: prediction?.homeScore ?? null,
            predictedAway: prediction?.awayScore ?? null,
          });
          emailSubject = `FriendsBets: матч начался — ${matchTitle}`;
          emailText = emailContent.text;
          emailHtml = emailContent.html;
        } else {
          title = `Прогноз: ${matchTitle}`;
          inAppBody = buildMissingPredictionInAppBody({
            gameTitle: game.title,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            startsAt: match.startsAt,
          });
          telegramHtml = buildMissingPredictionTelegramText({
            gameTitle: game.title,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            startsAt: match.startsAt,
            timeLabel: label,
            inviteCode: game.inviteCode,
          });
          const emailContent = buildPreMatchReminderEmail({
            userName: participant.displayName,
            gameTitle: game.title,
            gameInviteCode: game.inviteCode,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            startsAt: match.startsAt,
            timeLabel: label,
          });
          emailSubject = emailContent.subject;
          emailText = emailContent.text;
          emailHtml = emailContent.html;
        }

        try {
          const delivered = await deliverMatchReminderToUser({
            userId: participant.userId,
            email: participant.user.email,
            emailVerifiedAt: participant.user.emailVerifiedAt,
            telegramChatId: participant.user.telegramChatId,
            title,
            inAppBody,
            inviteCode: game.inviteCode,
            emailSubject,
            emailText,
            emailHtml,
            telegramHtml,
            logTag: "reminders:participant",
          });

          if (!delivered.anyDelivered) {
            result.skipped++;
            continue;
          }

          await prisma.predictionReminder.create({
            data: {
              gameId: game.id,
              matchId: match.id,
              userId: participant.userId,
              kind,
            },
          });
          alreadySent.add(key);
          result.sent++;
        } catch (error) {
          logOperationError("reminders:participant", error, {
            gameId: game.id,
            matchId: match.id,
            email: maskEmail(participant.user.email),
          });
          result.errors++;
        }
      }

      if (missingParticipants.length === 0) continue;

      const missingNames = missingParticipants.map((p) => p.displayName);
      const adminRecipients = getAdminRecipients(game);

      for (const admin of adminRecipients) {
        result.checked++;
        const key = reminderKey(game.id, match.id, admin.userId, adminKind);

        if (alreadySent.has(key)) {
          result.skipped++;
          continue;
        }

        try {
          await sendAdminMissingListEmail({
            to: admin.email,
            adminName: admin.name,
            gameTitle: game.title,
            gameInviteCode: game.inviteCode,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            startsAt: match.startsAt,
            timeLabel: label,
            missingNames,
          });

          await prisma.predictionReminder.create({
            data: {
              gameId: game.id,
              matchId: match.id,
              userId: admin.userId,
              kind: adminKind,
            },
          });
          alreadySent.add(key);
          result.sent++;
        } catch (error) {
          logOperationError("reminders:admin", error, {
            gameId: game.id,
            matchId: match.id,
            email: maskEmail(admin.email),
          });
          result.errors++;
        }
      }
    }
  }
}

export async function sendDuePredictionReminders(
  now = new Date(),
): Promise<ReminderRunResult> {
  const started = Date.now();
  const result: ReminderRunResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  const matchInclude = {
    homeTeam: true,
    awayTeam: true,
    tournament: {
      include: {
        games: {
          select: {
            id: true,
            title: true,
            inviteCode: true,
            createdById: true,
            createdBy: {
              select: {
                id: true,
                email: true,
                name: true,
                emailVerifiedAt: true,
              },
            },
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
        },
      },
    },
  } as const;

  const [preMatchCandidates, liveCandidates] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: MatchStatus.SCHEDULED,
        startsAt: preMatchReminderCandidateStartsAtRange(now),
      },
      include: matchInclude,
    }),
    prisma.match.findMany({
      where: {
        status: MatchStatus.SCHEDULED,
        startsAt: liveReminderCandidateStartsAtRange(now),
      },
      include: matchInclude,
    }),
  ]);

  const predictablePreMatch = preMatchCandidates.filter(
    isMatchPredictable,
  ) as ReminderMatchRow[];
  const predictableLive = liveCandidates.filter(
    isMatchPredictable,
  ) as ReminderMatchRow[];

  for (const slot of MATCH_REMINDER_SCHEDULE) {
    const pool = slot.matchStarted ? predictableLive : predictablePreMatch;
    const matches = pool.filter((match) =>
      isMatchReminderDue(now, match.startsAt, slot),
    );

    await processReminderBatch({
      matches,
      kind: slot.kind,
      adminKind: slot.adminKind,
      label: slot.label,
      matchStarted: slot.matchStarted,
      result,
    });
  }

  const nightResult = await sendNightBatchPredictionReminders(now);
  result.checked += nightResult.checked;
  result.sent += nightResult.sent;
  result.skipped += nightResult.skipped;
  result.errors += nightResult.errors;

  const openingH24Result = await sendOpeningMatchH24Reminders(now);
  result.checked += openingH24Result.checked;
  result.sent += openingH24Result.sent;
  result.skipped += openingH24Result.skipped;
  result.errors += openingH24Result.errors;

  logOperation("reminders:run", {
    durationMs: Date.now() - started,
    checked: result.checked,
    sent: result.sent,
    skipped: result.skipped,
    errors: result.errors,
    nightSent: nightResult.sent,
    openingH24Sent: openingH24Result.sent,
  });

  return result;
}
