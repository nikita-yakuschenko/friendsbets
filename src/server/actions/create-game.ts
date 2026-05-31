"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GameParticipantRole, TournamentStatus } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildGameUrl,
  buildRegisterInviteUrl,
  createUniqueGameSlug,
  createUniqueInviteCode,
} from "@/lib/game-invite";
import type { ActionResult } from "@/server/actions/auth";

export async function getCreateGameFormData() {
  await requireAuth();

  const [tournaments, scoringRules] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: TournamentStatus.ACTIVE },
      include: { _count: { select: { matches: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.scoringRule.findMany({ orderBy: { title: "asc" } }),
  ]);

  return {
    tournaments: tournaments.filter((t) => t._count.matches > 0),
    scoringRules,
  };
}

export async function createGameAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const scoringRuleId = String(formData.get("scoringRuleId") ?? "");
  const entryFeeText = String(formData.get("entryFeeText") ?? "").trim();

  if (!tournamentId || !scoringRuleId || !entryFeeText) {
    return { error: "Заполните все обязательные поля." };
  }

  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, status: TournamentStatus.ACTIVE },
    include: { _count: { select: { matches: true } } },
  });

  if (!tournament || tournament._count.matches === 0) {
    return { error: "Выберите доступное спортивное событие." };
  }

  const scoringRule = await prisma.scoringRule.findUnique({
    where: { id: scoringRuleId },
  });

  if (!scoringRule) {
    return { error: "Выберите правила начисления очков." };
  }

  const gameTitle = title || `Прогнозы — ${tournament.title}`;
  const slug = await createUniqueGameSlug(gameTitle);
  const inviteCode = await createUniqueInviteCode();

  const game = await prisma.game.create({
    data: {
      title: gameTitle,
      slug,
      inviteCode,
      entryFeeText,
      tournamentId,
      scoringRuleId,
      createdById: session.id,
      participants: {
        create: {
          userId: session.id,
          displayName: session.name,
          role: GameParticipantRole.ORGANIZER,
        },
      },
    },
  });

  redirect(`/create/success?slug=${encodeURIComponent(game.slug)}`);
}

export async function getCreatedGameInvite(slug: string) {
  const session = await requireAuth();

  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      tournament: true,
      scoringRule: true,
    },
  });

  if (!game || game.createdById !== session.id) {
    return null;
  }

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : undefined;

  return {
    game,
    inviteCode: game.inviteCode,
    registerUrl: buildRegisterInviteUrl(game.inviteCode, origin),
    gameUrl: buildGameUrl(game.slug, origin),
  };
}
