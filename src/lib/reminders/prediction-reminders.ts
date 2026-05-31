import {
  GameParticipantRole,
  MatchStatus,
  PredictionReminderKind,
} from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import { gamePath } from "@/lib/game-path";
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
  slug: string;
  createdById: string;
  createdBy: { id: string; email: string; name: string };
  participants: Array<{
    userId: string;
    displayName: string;
    role: GameParticipantRole;
    user: { id: string; email: string; name: string };
  }>;
};

function matchWindow(minutesBefore: number, now: Date) {
  const half = REMINDER_WINDOW_MS / 2;
  const targetMs = minutesBefore * 60 * 1000;
  return {
    gte: new Date(now.getTime() + targetMs - half),
    lte: new Date(now.getTime() + targetMs + half),
  };
}

function appOrigin(origin?: string): string {
  return (origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function predictionsUrl(slug: string, origin?: string): string {
  return `${appOrigin(origin)}${gamePath(slug, "predictions")}`;
}

function missingUrl(slug: string, origin?: string): string {
  return `${appOrigin(origin)}/admin/missing?game=${encodeURIComponent(slug)}`;
}

function getAdminRecipients(game: GameWithParticipants) {
  const recipients = new Map<string, { email: string; name: string }>();

  for (const participant of game.participants) {
    if (participant.role === GameParticipantRole.ORGANIZER) {
      recipients.set(participant.userId, {
        email: participant.user.email,
        name: participant.displayName,
      });
    }
  }

  if (!recipients.has(game.createdById)) {
    recipients.set(game.createdById, {
      email: game.createdBy.email,
      name: game.createdBy.name,
    });
  }

  return [...recipients.entries()].map(([userId, info]) => ({ userId, ...info }));
}

async function sendReminderEmail(params: {
  to: string;
  userName: string;
  gameTitle: string;
  gameSlug: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  timeLabel: string;
}) {
  const link = predictionsUrl(params.gameSlug);
  const subject = `FriendsBets: прогноз через ${params.timeLabel} — ${params.homeTeam} — ${params.awayTeam}`;
  const text = [
    `Привет, ${params.userName}!`,
    "",
    `До матча ${params.homeTeam} — ${params.awayTeam} осталось ${params.timeLabel}.`,
    `Начало: ${formatDateTime(params.startsAt)}.`,
    `Турнир: ${params.gameTitle}.`,
    "",
    "Вы ещё не сделали прогноз. Успейте до начала матча:",
    link,
    "",
    "— FriendsBets",
  ].join("\n");

  await sendEmail({
    to: params.to,
    subject,
    text,
    html: text.replace(/\n/g, "<br>"),
  });
}

async function sendAdminMissingListEmail(params: {
  to: string;
  adminName: string;
  gameTitle: string;
  gameSlug: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  timeLabel: string;
  missingNames: string[];
}) {
  const list = params.missingNames.map((name) => `- ${name}`).join("\n");
  const link = missingUrl(params.gameSlug);
  const subject = `FriendsBets: кто не поставил (через ${params.timeLabel}) — ${params.homeTeam} — ${params.awayTeam}`;
  const text = [
    `Привет, ${params.adminName}!`,
    "",
    `До матча ${params.homeTeam} — ${params.awayTeam} осталось ${params.timeLabel}.`,
    `Начало: ${formatDateTime(params.startsAt)}.`,
    `Турнир: ${params.gameTitle}.`,
    "",
    "Не сделали прогноз:",
    list,
    "",
    link,
    "",
    "— FriendsBets",
  ].join("\n");

  await sendEmail({
    to: params.to,
    subject,
    text,
    html: text.replace(/\n/g, "<br>"),
  });
}

export async function sendDuePredictionReminders(
  now = new Date(),
): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  for (const { kind, adminKind, minutesBefore, label } of REMINDER_SCHEDULE) {
    const startsAt = matchWindow(minutesBefore, now);

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
                slug: true,
                createdById: true,
                createdBy: {
                  select: { id: true, email: true, name: true },
                },
                participants: {
                  include: {
                    user: {
                      select: { id: true, email: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const match of matches.filter(isMatchPredictable)) {
      for (const game of match.tournament.games) {
        const predictions = await prisma.prediction.findMany({
          where: { gameId: game.id, matchId: match.id },
          select: { userId: true },
        });
        const predictedUserIds = new Set(predictions.map((p) => p.userId));
        const missingParticipants = game.participants.filter(
          (participant) => !predictedUserIds.has(participant.userId),
        );

        for (const participant of missingParticipants) {
          result.checked++;

          const alreadySent = await prisma.predictionReminder.findUnique({
            where: {
              gameId_matchId_userId_kind: {
                gameId: game.id,
                matchId: match.id,
                userId: participant.userId,
                kind,
              },
            },
          });

          if (alreadySent) {
            result.skipped++;
            continue;
          }

          try {
            await sendReminderEmail({
              to: participant.user.email,
              userName: participant.displayName,
              gameTitle: game.title,
              gameSlug: game.slug,
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

            result.sent++;
          } catch (error) {
            console.error("[reminders:participant]", error);
            result.errors++;
          }
        }

        if (missingParticipants.length === 0) continue;

        const missingNames = missingParticipants.map((p) => p.displayName);
        const adminRecipients = getAdminRecipients(game);

        for (const admin of adminRecipients) {
          result.checked++;

          const alreadySent = await prisma.predictionReminder.findUnique({
            where: {
              gameId_matchId_userId_kind: {
                gameId: game.id,
                matchId: match.id,
                userId: admin.userId,
                kind: adminKind,
              },
            },
          });

          if (alreadySent) {
            result.skipped++;
            continue;
          }

          try {
            await sendAdminMissingListEmail({
              to: admin.email,
              adminName: admin.name,
              gameTitle: game.title,
              gameSlug: game.slug,
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

            result.sent++;
          } catch (error) {
            console.error("[reminders:admin]", error);
            result.errors++;
          }
        }
      }
    }
  }

  return result;
}
