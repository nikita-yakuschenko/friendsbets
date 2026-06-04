import type { Metadata } from "next";
import { absoluteAppUrl } from "@/lib/app-origin";
import { findGameByInviteCode } from "@/lib/game-invite";
import { prisma } from "@/lib/db";
import {
  normalizeInviteCodeInput,
  validateInviteCodeFormat,
} from "@/lib/invite-code";
import {
  buildTournamentSourceLabelMap,
  resolveSourceLabelForGame,
} from "@/lib/tournament-source-label";

export type InviteLandingInfo = {
  inviteCode: string;
  gameTitle: string;
  templateTitle: string | null;
};

const SITE_OG_TITLE = "FriendsBets — турнир прогнозов";
const SITE_TAGLINE = "Закрытый турнир прогнозов на футбольные матчи";

export async function getInviteLandingByCode(
  raw: string,
): Promise<InviteLandingInfo | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const formatError = validateInviteCodeFormat(trimmed);
  if (formatError) return null;

  const game = await findGameByInviteCode(trimmed);
  if (!game) return null;

  const row = await prisma.game.findUnique({
    where: { id: game.id },
    select: {
      title: true,
      inviteCode: true,
      tournament: { select: { externalId: true } },
    },
  });
  if (!row) return null;

  const labelMap = await buildTournamentSourceLabelMap([
    row.tournament.externalId,
  ]);
  const templateTitle = resolveSourceLabelForGame(
    row.title,
    row.tournament.externalId,
    labelMap,
  );

  return {
    inviteCode: row.inviteCode,
    gameTitle: row.title,
    templateTitle,
  };
}

export function buildInviteOpenGraphDescription(
  info: InviteLandingInfo,
): string {
  const parts = [
    SITE_TAGLINE,
    `Присоединяйся к турниру «${info.gameTitle}»`,
  ];
  if (info.templateTitle) parts.push(info.templateTitle);
  return parts.join(". ");
}

export function buildInvitePageMetadata(
  info: InviteLandingInfo | null,
  origin?: string,
): Metadata {
  const imageUrl = absoluteAppUrl("/favicon.png", origin);

  const description = info
    ? buildInviteOpenGraphDescription(info)
    : SITE_TAGLINE;

  return {
    title: SITE_OG_TITLE,
    description,
    openGraph: {
      title: SITE_OG_TITLE,
      description,
      siteName: "FriendsBets",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: "FriendsBets",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: SITE_OG_TITLE,
      description,
      images: [imageUrl],
    },
  };
}

/** Нормализованный код из сегмента URL `/invite/[code]`. */
export function normalizeInviteRouteParam(code: string): string {
  try {
    return normalizeInviteCodeInput(decodeURIComponent(code));
  } catch {
    return normalizeInviteCodeInput(code);
  }
}
