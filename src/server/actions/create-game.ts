"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { GameParticipantRole } from "@/generated/prisma/client";
import { parseGameAccessModeInput } from "@/lib/game-access-mode";
import { requireAuth } from "@/lib/auth";
import {
  linkTournamentFromTemplate,
  listTournamentTemplatesForUi,
  resolveTournamentFromCreateForm,
  saveTournamentTemplateFromProfessional,
  shouldSaveAsTemplate,
} from "@/lib/tournament-templates";
import { getAppOriginFromHeaders } from "@/lib/app-origin";
import {
  buildGameUrl,
  buildRegisterInviteUrl,
  createUniqueGameSlug,
  createUniqueInviteCode,
} from "@/lib/game-invite";
import {
  validateInviteCodeFormat,
  normalizeInviteCodeInput,
} from "@/lib/invite-code";
import { prisma } from "@/lib/db";
import { normalizeGameRouteParam, revalidateGamePaths } from "@/lib/game-access";
import {
  enrichChampionatTournamentVenues,
  ensureChampionatTournament,
} from "@/lib/tournament-setup";
import {
  type ParsedChampionatTournamentUrl,
} from "@/lib/championat-url";
import type { ActionResult } from "@/server/actions/auth";

export async function getCreateGameFormData() {
  await requireAuth();

  const [scoringRules, tournamentTemplates] = await Promise.all([
    prisma.scoringRule.findMany({ orderBy: { title: "asc" } }),
    listTournamentTemplatesForUi(),
  ]);

  const defaultTemplateId =
    tournamentTemplates.find((template) => template.isSystem)?.id ??
    tournamentTemplates[0]?.id ??
    "";

  return {
    scoringRules,
    tournamentTemplates,
    defaultTemplateId,
  };
}

export async function createGameAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const scoringRuleId = String(formData.get("scoringRuleId") ?? "");
  const inviteCodeRaw = String(formData.get("inviteCode") ?? "").trim();

  if (!title) {
    return { error: "Укажите название турнира." };
  }

  if (!scoringRuleId) {
    return { error: "Выберите схему начисления очков." };
  }

  const createMode = String(formData.get("createMode") ?? "template");
  const accessMode = parseGameAccessModeInput(
    String(formData.get("accessMode") ?? "REQUEST"),
  );

  if (inviteCodeRaw) {
    const formatError = validateInviteCodeFormat(inviteCodeRaw);
    if (formatError) return { error: formatError };
  }

  const scoringRule = await prisma.scoringRule.findUnique({
    where: { id: scoringRuleId },
  });

  if (!scoringRule) {
    return { error: "Выберите правила начисления очков." };
  }

  let tournamentId: string;
  let matchCount = 0;
  let championatBackgroundSync: ParsedChampionatTournamentUrl | null = null;

  if (createMode === "template") {
    const templateId = String(formData.get("tournamentTemplateId") ?? "").trim();
    const linked = await linkTournamentFromTemplate(templateId);
    if (!linked.ok) {
      return { error: linked.error };
    }
    tournamentId = linked.tournamentId;
    matchCount = linked.matchCount;
    console.info(
      `[create-tournament] template link user=${session.id} matches=${matchCount}`,
    );
  } else {
    const tournamentResolved = await resolveTournamentFromCreateForm(formData);
    if (!tournamentResolved.ok) {
      return { error: tournamentResolved.error };
    }

    const parsedUrl = tournamentResolved.parsed;

    if (shouldSaveAsTemplate(formData)) {
      const templateSaveTitle = String(formData.get("templateSaveTitle") ?? "").trim();
      const templateSaveDescription =
        String(formData.get("templateSaveDescription") ?? "").trim() || null;

      if (!templateSaveTitle) {
        return { error: "Укажите название шаблона для сохранения." };
      }

      try {
        await saveTournamentTemplateFromProfessional({
          title: templateSaveTitle,
          description: templateSaveDescription,
          championatUrl: tournamentResolved.championatUrl,
          createdById: session.id,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_CHAMPIONAT_URL") {
          return { error: "Не удалось сохранить шаблон: неверная ссылка Championat." };
        }
        return { error: "Не удалось сохранить шаблон. Попробуйте ещё раз." };
      }
    }

    try {
      console.info(`[create-tournament] professional sync user=${session.id}`);
      const tournament = await ensureChampionatTournament(parsedUrl);
      tournamentId = tournament.id;
      matchCount = tournament.matchCount;
      console.info(
        `[create-tournament] championat ready matches=${matchCount} tournamentId=${tournamentId}`,
      );

      if (process.env.CHAMPIONAT_BACKGROUND_VENUES === "1") {
        championatBackgroundSync = parsedUrl;
      }
    } catch (error) {
      console.error("[create-tournament] championat failed", error);
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить турнир с Championat.";
      return { error: message };
    }
  }

  let inviteCode: string;
  try {
    inviteCode = await createUniqueInviteCode(
      inviteCodeRaw ? normalizeInviteCodeInput(inviteCodeRaw) : undefined,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_CODE_TAKEN") {
      return { error: "Этот invite-код уже занят. Выберите другой или сгенерируйте новый." };
    }
    return { error: "Не удалось создать invite-код. Попробуйте ещё раз." };
  }

  console.info("[create-tournament] creating game record…");
  const slug = await createUniqueGameSlug(title);

  const game = await prisma.game.create({
    data: {
      title,
      slug,
      inviteCode,
      accessMode,
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

  if (championatBackgroundSync) {
    const source = championatBackgroundSync;
    after(() => enrichChampionatTournamentVenues(tournamentId, source));
  }

  console.info(
    `[create-tournament] done slug=${game.slug} invite=${game.inviteCode} matches=${matchCount}`,
  );
  await revalidateGamePaths(game.id);
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/");
  revalidatePath("/create/success");
  redirect(`/create/success?invite=${encodeURIComponent(game.inviteCode)}`);
}

export async function getCreatedGameInvite(inviteParam: string) {
  const session = await requireAuth();
  const inviteCode = normalizeInviteCodeInput(normalizeGameRouteParam(inviteParam));

  let game = await prisma.game.findUnique({
    where: { inviteCode },
    include: {
      tournament: true,
      scoringRule: true,
    },
  });

  if (!game) {
    game = await prisma.game.findUnique({
      where: { slug: normalizeGameRouteParam(inviteParam) },
      include: {
        tournament: true,
        scoringRule: true,
      },
    });
  }

  if (!game || game.createdById !== session.id) {
    return null;
  }

  const headersList = await headers();
  const origin = getAppOriginFromHeaders(headersList);

  return {
    game,
    inviteCode: game.inviteCode,
    registerUrl: buildRegisterInviteUrl(game.inviteCode, origin),
    gameUrl: buildGameUrl(game.inviteCode, origin),
  };
}
