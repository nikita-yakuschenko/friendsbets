import {
  GameParticipantRole,
  MatchStatus,
  PredictionReminderKind,
} from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import {
  buildAdminMissingPredictionsEmail,
  buildPredictionReminderEmail,
} from "@/lib/email/templates";
import { getAppOriginFromEnv } from "@/lib/app-origin";
import { gamePath } from "@/lib/game-path";
import { logOperation, logOperationError, maskEmail } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { formatDateTime } from "@/lib/utils";

/** Окно отправки относительно целевого времени (cron каждые ~5–10 мин). */
const REMINDER_WINDOW_MS = 10 * 60 * 1000;

export const REMINDER_SCHEDULE = [
  {
    kind: PredictionReminderKind.H3,
    adminKind: PredictionReminderKind.H3_ADMIN,
    minutesBefore: 180,
    label: "3 часа",
  },
  {
    kind: PredictionReminderKind.H1,
    adminKind: PredictionReminderKind.H1_ADMIN,
    minutesBefore: 60,
    label: "1 час",
  },
  {
    kind: PredictionReminderKind.M15,
    adminKind: PredictionReminderKind.M15_ADMIN,
    minutesBefore: 15,
    label: "15 минут",
  },
] as const;

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
    };
  }>;
};

type ReminderMatchRow = {
  id: string;
  startsAt: Date;
  homeTeam: { name: string };
  awayTeam: { name: string };
  tournament: { games: GameWithParticipants[] };
};

/** Окно startsAt для напоминания (экспорт для тестов). */
export function matchReminderWindow(minutesBefore: number, now: Date) {
  const half = REMINDER_WINDOW_MS / 2;
  const targetMs = minutesBefore * 60 * 1000;
  return {
    gte: new Date(now.getTime() + targetMs - half),
    lte: new Date(now.getTime() + targetMs + half),
  };
}

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

async function sendReminderEmail(params: {
  to: string;
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

  await sendEmail({ to: params.to, subject, text, html });
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
  result: ReminderRunResult;
}) {
  const { matches, kind, adminKind, label, result } = params;
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
    select: { gameId: true, matchId: true, userId: true },
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
    for (const game of match.tournament.games) {
      const missingParticipants = game.participants.filter(
        (participant) =>
          !predictedKeys.has(
            `${game.id}:${match.id}:${participant.userId}`,
          ),
      );

      for (const participant of missingParticipants) {
        result.checked++;
        const key = reminderKey(game.id, match.id, participant.userId, kind);

        if (alreadySent.has(key)) {
          result.skipped++;
          continue;
        }

        if (!participant.user.emailVerifiedAt) {
          result.skipped++;
          continue;
        }

        try {
          await sendReminderEmail({
            to: participant.user.email,
            userName: participant.displayName,
            gameTitle: game.title,
            gameInviteCode: game.inviteCode,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            startsAt: match.startsAt,
            timeLabel: label,
          });

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

  for (const { kind, adminKind, minutesBefore, label } of REMINDER_SCHEDULE) {
    const startsAt = matchReminderWindow(minutesBefore, now);

    const matches = await prisma.match.findMany({
      where: {
        status: MatchStatus.SCHEDULED,
        startsAt,
      },
      include: {
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

    await processReminderBatch({
      matches: matches.filter(isMatchPredictable) as ReminderMatchRow[],
      kind,
      adminKind,
      label,
      result,
    });
  }

  logOperation("reminders:run", {
    durationMs: Date.now() - started,
    checked: result.checked,
    sent: result.sent,
    skipped: result.skipped,
    errors: result.errors,
  });

  return result;
}
