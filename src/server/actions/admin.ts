"use server";

import { revalidatePath } from "next/cache";
import { MatchStatus, GameParticipantRole, UserRole } from "@/generated/prisma/client";
import { getAppOriginFromEnv } from "@/lib/app-origin";
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
import { buildMissingPredictionReminderText } from "@/lib/missing-prediction-reminder";
import { deriveWinnerTeamId } from "@/lib/utils";
import type { ActionResult } from "@/server/actions/auth";
import { handleMatchFinished } from "@/lib/match-result-notifications";
import {
  listAdminPlatformMatches,
  listTemplateTournamentIdsForRecalc,
  recalculateAllScoresForTournament,
  recalculateMatchScoresForTournament,
} from "@/lib/template-match-admin";
import { parseChampionatTournamentUrl } from "@/lib/championat-url";
import { getChampionatSyncConfig } from "@/lib/football-api/client";
import { syncChampionatTournament, syncMatches } from "@/lib/football-api/sync";
import { ensureChampionatTournament } from "@/lib/tournament-setup";
import { getTournamentTemplateRecord } from "@/lib/tournament-templates";
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

  if (!matchId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return { error: "Некорректные данные." };
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, homeTeamId: true, awayTeamId: true, tournamentId: true },
  });
  if (!match) return { error: "Матч не найден." };

  if (!isSuperadmin(session.role)) {
    return { error: "Нет доступа." };
  }

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

  await handleMatchFinished(match.tournamentId, matchId);

  const gameIds = await prisma.game.findMany({
    where: { tournamentId: match.tournamentId },
    select: { id: true },
  });

  revalidatePath("/admin");
  for (const { id: gameId } of gameIds) {
    await revalidateGamePaths(gameId);
  }

  return { success: true };
}

export async function syncTemplateChampionatAction(
  templateId: string,
): Promise<
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
    return { error: "Нет доступа." };
  }

  const template = await getTournamentTemplateRecord(templateId);
  if (!template) {
    return { error: "Шаблон не найден." };
  }

  const parsed = parseChampionatTournamentUrl(template.championatUrl);
  if (!parsed) {
    return { error: "В шаблоне неверная ссылка Championat." };
  }

  try {
    let tournament = await prisma.tournament.findUnique({
      where: { externalId: parsed.tournamentExternalId },
    });

    if (!tournament) {
      const ensured = await ensureChampionatTournament(parsed);
      tournament = await prisma.tournament.findUnique({
        where: { id: ensured.id },
      });
    }

    if (!tournament) {
      return { error: "Не удалось создать турнир в базе." };
    }

    const result = await syncChampionatTournament(tournament.id, parsed, {
      enrichVenues: true,
    });

    revalidatePath("/admin");
    revalidatePath("/", "layout");

    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Не удалось синхронизировать календарь шаблона.";
    return { error: message };
  }
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

const GAME_TITLE_MAX_LENGTH = 120;

/** Суперадмин: переименовать любой турнир (Game.title), без участия в игре. */
export async function updateGameTitleBySuperadminAction(
  gameId: string,
  titleRaw: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    return { error: "Нет доступа." };
  }

  const title = titleRaw.trim();
  if (!title) {
    return { error: "Укажите название турнира." };
  }
  if (title.length > GAME_TITLE_MAX_LENGTH) {
    return {
      error: `Название не длиннее ${GAME_TITLE_MAX_LENGTH} символов.`,
    };
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, inviteCode: true, title: true },
  });
  if (!game) {
    return { error: "Турнир не найден." };
  }

  if (game.title === title) {
    return { success: true, message: "Название без изменений." };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { title },
  });

  await revalidateGamePaths(gameId);
  revalidatePath("/admin");
  revalidatePath("/");

  return { success: true, message: `Турнир переименован в «${title}».` };
}

export async function getAdminDashboardData(userId: string, role: UserRole) {
  const manageableGames = await getMissingPredictionsGames(userId, role);
  if (manageableGames.length === 0) {
    if (!isSuperadmin(role)) {
      throw new Error("FORBIDDEN");
    }
    const [tournaments, platformMatches, templates] = await Promise.all([
      prisma.tournament.findMany({ orderBy: { createdAt: "desc" } }),
      listAdminPlatformMatches(userId, role),
      listTournamentTemplatesForUi(),
    ]);
    return { tournaments, games: [], matches: platformMatches, templates };
  }

  const games = await prisma.game.findMany({
    where: { id: { in: manageableGames.map((game) => game.id) } },
    include: {
      tournament: true,
      scoringRule: true,
      createdBy: { select: { name: true } },
      participants: {
        where: { role: GameParticipantRole.ORGANIZER },
        orderBy: { joinedAt: "asc" },
        select: { displayName: true },
      },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tournamentIds = [...new Set(games.map((game) => game.tournamentId))];

  const [tournaments, platformMatches, templates] = await Promise.all([
    prisma.tournament.findMany({
      where: isSuperadmin(role) ? {} : { id: { in: tournamentIds } },
      orderBy: { createdAt: "desc" },
    }),
    listAdminPlatformMatches(userId, role),
    listTournamentTemplatesForUi(),
  ]);

  return { tournaments, games, matches: platformMatches, templates };
}

export async function getAdminIntegrationInfo() {
  await requireAuth();

  const championat = getChampionatSyncConfig();
  const appUrl = getAppOriginFromEnv();

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
  options?: { tournamentId?: string },
): Promise<ActionResult> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    return { error: "Нет доступа." };
  }

  let tournamentIds: string[];

  if (options?.tournamentId) {
    tournamentIds = [options.tournamentId];
  } else {
    tournamentIds = await listTemplateTournamentIdsForRecalc();
  }

  if (tournamentIds.length === 0) {
    return { error: "Нет турниров для пересчёта." };
  }

  for (const tournamentId of tournamentIds) {
    await recalculateAllScoresForTournament(tournamentId);

    const gameIds = await prisma.game.findMany({
      where: { tournamentId },
      select: { id: true },
    });
    for (const { id: gameId } of gameIds) {
      await revalidateGamePaths(gameId);
    }
  }

  revalidatePath("/admin");

  return { success: true };
}

export async function getAdminMissingPredictions(routeParam: string) {
  const session = await requireAuth();
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) return [];

  if (!(await canManageGame(session, gameId))) return [];

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
    const missingParticipants = game.participants
      .filter((participant) => !predictedUserIds.has(participant.userId))
      .map((participant) => ({
        userId: participant.userId,
        displayName: participant.displayName,
      }));

    const reminderText = buildMissingPredictionReminderText({
      gameTitle: game.title,
      homeTeam: {
        name: match.homeTeam.name,
        countryCode: match.homeTeam.countryCode,
      },
      awayTeam: {
        name: match.awayTeam.name,
        countryCode: match.awayTeam.countryCode,
      },
      startsAt: match.startsAt,
      inviteCode: game.inviteCode,
    });

    return {
      match: {
        id: match.id,
        startsAt: match.startsAt,
        homeTeam: {
          name: match.homeTeam.name,
          countryCode: match.homeTeam.countryCode,
        },
        awayTeam: {
          name: match.awayTeam.name,
          countryCode: match.awayTeam.countryCode,
        },
      },
      missingParticipants,
      reminderText,
      inviteCode: game.inviteCode,
    };
  });
}

export type AdminBroadcastUserOption = {
  id: string;
  name: string;
  email: string;
  telegramLinked: boolean;
};

export async function getAdminBroadcastUserOptions(): Promise<
  AdminBroadcastUserOption[]
> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    throw new Error("FORBIDDEN");
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      telegramChatId: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    telegramLinked: user.telegramChatId != null,
  }));
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
      avatarUrl: user.avatarUrl,
      updatedAt: user.updatedAt.toISOString(),
      platformRole: user.role,
      createdAt: user.createdAt.toISOString(),
      organizerGames,
      participantGames,
      telegramLinked: user.telegramChatId != null,
      telegramUsername: user.telegramUsername,
    };
  });
}

export async function getAdminUserById(userId: string) {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    throw new Error("FORBIDDEN");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      gameParticipants: {
        include: {
          game: { select: { id: true, title: true, inviteCode: true } },
        },
      },
      _count: { select: { createdGames: true } },
    },
  });

  if (!user) return null;

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
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt.toISOString(),
    platformRole: user.role,
    createdAt: user.createdAt.toISOString(),
    createdGamesCount: user._count.createdGames,
    organizerGames,
    participantGames,
    telegramLinked: user.telegramChatId != null,
    telegramUsername: user.telegramUsername,
  };
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    return { error: "Нет доступа." };
  }
  if (userId === session.id) {
    return { error: "Нельзя удалить свой аккаунт." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      _count: { select: { createdGames: true } },
    },
  });
  if (!user) {
    return { error: "Пользователь не найден." };
  }
  if (user.role === UserRole.ADMIN) {
    return { error: "Нельзя удалить суперадмина." };
  }
  if (user._count.createdGames > 0) {
    return {
      error:
        "Пользователь создал турниры. Передайте организатора или удалите турниры.",
    };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return { success: true, message: "Пользователь удалён." };
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

/** Суперадмин: назначить пользователя организатором турнира (участник → ORGANIZER или вступление с ролью). */
export async function assignGameOrganizerAction(
  userId: string,
  gameId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    return { error: "Нет доступа." };
  }

  const [user, game] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    }),
    prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, title: true, inviteCode: true },
    }),
  ]);

  if (!user) return { error: "Пользователь не найден." };
  if (!game) return { error: "Турнир не найден." };

  const existing = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
    select: { id: true, role: true },
  });

  if (existing?.role === GameParticipantRole.ORGANIZER) {
    return {
      success: true,
      message: `«${user.name}» уже организатор «${game.title}».`,
    };
  }

  if (existing) {
    await prisma.gameParticipant.update({
      where: { id: existing.id },
      data: { role: GameParticipantRole.ORGANIZER },
    });
  } else {
    await prisma.gameParticipant.create({
      data: {
        gameId,
        userId,
        displayName: user.name,
        role: GameParticipantRole.ORGANIZER,
      },
    });
  }

  await revalidateGamePaths(gameId);
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return {
    success: true,
    message: `«${user.name}» назначен организатором «${game.title}».`,
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
