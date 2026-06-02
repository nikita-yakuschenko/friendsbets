"use server";

import { revalidatePath } from "next/cache";
import { MatchStatus, GameParticipantRole, UserRole } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  canManageGame,
  isGameOrganizer,
  revalidateGamePaths,
  resolveGameIdFromRoute,
} from "@/lib/game-access";
import { isSuperadmin } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { deriveWinnerTeamId } from "@/lib/utils";
import type { ActionResult } from "@/server/actions/auth";
import { recalculateMatchScoresAction } from "@/server/actions/games";
import { getChampionatSyncConfig } from "@/lib/football-api/client";
import { syncMatches } from "@/lib/football-api/sync";
import { listTournamentTemplatesForUi } from "@/lib/tournament-templates";
import { getEmailDeliveryMode, sendEmail } from "@/lib/email";
import { buildTestEmailContent } from "@/lib/email/templates";
import { checkRateLimit } from "@/lib/rate-limit";

export async function updateMatchResultAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();

  const matchId = String(formData.get("matchId") ?? "");
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const gameId = String(formData.get("gameId") ?? "");

  if (!matchId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return { error: "Некорректные данные." };
  }

  if (!gameId) {
    return { error: "Игра не указана." };
  }

  const allowed =
    isSuperadmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) {
    return { error: "Нет доступа." };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Матч не найден." };

  const winnerTeamId = deriveWinnerTeamId(
    homeScore,
    awayScore,
    match.homeTeamId,
    match.awayTeamId,
  );

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      winnerTeamId,
      status: MatchStatus.FINISHED,
    },
  });

  if (gameId) {
    await recalculateMatchScoresAction(gameId, matchId);
  }

  revalidatePath("/admin");
  if (gameId) {
    await revalidateGamePaths(gameId);
  }

  return { success: true };
}

export async function syncChampionatMatchesAction(): Promise<
  ActionResult & {
    created?: number;
    updated?: number;
    teamsCreated?: number;
    teamsUpdated?: number;
    venuesUpdated?: number;
    total?: number;
  }
> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    const games = await getMissingPredictionsGames(session.id, session.role);
    if (games.length === 0) {
      return { error: "Нет доступа." };
    }
  }

  try {
    const result = await syncMatches();
    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось синхронизировать матчи.";
    return { error: message };
  }
}

export async function deleteGameAction(gameId: string): Promise<ActionResult> {
  const session = await requireAuth();

  if (!gameId) {
    return { error: "Игра не указана." };
  }

  const allowed = await canManageGame(session, gameId);
  if (!allowed) {
    return { error: "Нет доступа." };
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, inviteCode: true },
  });

  if (!game) {
    return { error: "Турнир не найден." };
  }

  await revalidateGamePaths(gameId);
  await prisma.game.delete({ where: { id: gameId } });

  revalidatePath("/admin");
  revalidatePath("/admin/missing");
  revalidatePath("/");

  return { success: true };
}

export async function getAdminDashboardData(userId: string, role: UserRole) {
  const manageableGames = await getMissingPredictionsGames(userId, role);
  if (manageableGames.length === 0) {
    throw new Error("FORBIDDEN");
  }

  const games = await prisma.game.findMany({
    where: { id: { in: manageableGames.map((game) => game.id) } },
    include: {
      tournament: true,
      scoringRule: true,
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tournamentIds = [...new Set(games.map((game) => game.tournamentId))];

  const [tournaments, matches, templates] = await Promise.all([
    prisma.tournament.findMany({
      where: isSuperadmin(role) ? {} : { id: { in: tournamentIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.findMany({
      where: { tournamentId: { in: tournamentIds } },
      include: { homeTeam: true, awayTeam: true, tournament: true },
      orderBy: { startsAt: "asc" },
    }),
    listTournamentTemplatesForUi(),
  ]);

  return { tournaments, games, matches, templates };
}

export async function getAdminIntegrationInfo() {
  await requireAuth();

  const championat = getChampionatSyncConfig();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    appUrl,
    championat: {
      tournamentId: championat.championatTournamentId,
      sportSlug: championat.sportSlug,
      calendarUrl: championat.calendarUrl,
      tournamentExternalId: championat.tournamentExternalId,
      dbTournamentId: championat.dbTournamentId ?? null,
    },
    cron: {
      syncMatchesPath: "/api/cron/sync-matches",
      predictionRemindersPath: "/api/cron/prediction-reminders",
      hasSecret: Boolean(process.env.CRON_SECRET),
    },
    flagsApiPath: "/api/flags/[code]",
  };
}

export async function recalculateAllScoresAction(
  gameId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const allowed =
    isSuperadmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) {
    return { error: "Нет доступа." };
  }

  const games = await prisma.game.findMany({ where: { id: gameId } });
  if (!games.length) return { error: "Игра не найдена." };

  const finishedMatches = await prisma.match.findMany({
    where: {
      tournamentId: games[0].tournamentId,
      status: MatchStatus.FINISHED,
    },
  });

  for (const match of finishedMatches) {
    await recalculateMatchScoresAction(gameId, match.id);
  }

  revalidatePath("/admin");
  await revalidateGamePaths(gameId);

  return { success: true };
}

export async function getAdminMissingPredictions(routeParam: string) {
  const session = await requireAuth();
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return [];

  const allowed =
    isSuperadmin(session.role) || (await isGameOrganizer(session.id, gameId));
  if (!allowed) return [];

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      participants: true,
      tournament: true,
    },
  });
  if (!game) return [];

  const upcomingMatches = await prisma.match.findMany({
    where: {
      tournamentId: game.tournamentId,
      startsAt: { gt: new Date() },
      status: MatchStatus.SCHEDULED,
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        where: { gameId },
        select: { userId: true },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  return upcomingMatches.filter(isMatchPredictable).map((match) => {
    const predictedUserIds = new Set(match.predictions.map((p) => p.userId));
    const missingParticipants = game.participants.filter(
      (participant) => !predictedUserIds.has(participant.userId),
    );

    return {
      match,
      missingParticipants,
      reminderText: `Не сделали прогноз на матч ${match.homeTeam.name} — ${match.awayTeam.name}: ${missingParticipants.map((p) => p.displayName).join(", ") || "все сделали"}`,
    };
  });
}

export async function getAdminUsers() {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    throw new Error("FORBIDDEN");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      gameParticipants: {
        include: {
          game: { select: { id: true, title: true, inviteCode: true } },
        },
      },
    },
  });

  return users.map((user) => {
    const organizerGames = user.gameParticipants
      .filter((p) => p.role === GameParticipantRole.ORGANIZER)
      .map((p) => ({
        id: p.game.id,
        title: p.game.title,
        inviteCode: p.game.inviteCode,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));

    const participantGames = user.gameParticipants
      .filter((p) => p.role === GameParticipantRole.PARTICIPANT)
      .map((p) => ({
        id: p.game.id,
        title: p.game.title,
        inviteCode: p.game.inviteCode,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.role,
      createdAt: user.createdAt.toISOString(),
      organizerGames,
      participantGames,
    };
  });
}

export async function sendTestEmailToUserAction(
  userId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    return { error: "Нет доступа." };
  }

  const rate = checkRateLimit(
    `admin:test-email:${session.id}`,
    20,
    60 * 60 * 1000,
  );
  if (!rate.allowed) {
    return { error: "Слишком много тестовых писем. Попробуйте позже." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return { error: "Пользователь не найден." };
  }

  const deliveryMode = getEmailDeliveryMode();
  const subject = "FriendsBets: проверка доставки почты";
  const { text, html } = buildTestEmailContent(user.name);

  try {
    await sendEmail({
      to: user.email,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("[admin:test-email]", user.email, err);
    return {
      error:
        "Не удалось отправить письмо. Проверьте SMTP_HOST, SMTP_FROM и учётные данные.",
    };
  }

  if (deliveryMode === "mock") {
    return {
      success: true,
      message: `SMTP не настроен — письмо записано в консоль сервера ([email:mock]) для ${user.email}.`,
    };
  }

  return {
    success: true,
    message: `Тестовое письмо отправлено на ${user.email}. Проверьте входящие и спам.`,
  };
}

export async function getMissingPredictionsGames(userId: string, role: UserRole) {
  if (isSuperadmin(role)) {
    return prisma.game.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, inviteCode: true },
    });
  }

  return prisma.game.findMany({
    where: {
      participants: {
        some: { userId, role: GameParticipantRole.ORGANIZER },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, inviteCode: true },
  });
}
