import {
  GameAccessMode,
  GameJoinRequestStatus,
  GameParticipantRole,
} from "@/generated/prisma/client";
import { findGameByInviteCode } from "@/lib/game-invite";
import {
  formatGameOrganizersLine,
  getGameOrganizerDisplayNames,
} from "@/lib/game-organizer";
import { prisma } from "@/lib/db";
import {
  normalizeInviteCodeInput,
  validateInviteCodeFormat,
} from "@/lib/invite-code";

export type GameJoinPreview = {
  gameId: string;
  title: string;
  inviteCode: string;
  organizerName: string;
  scoringRuleTitle: string;
  participantsCount: number;
  alreadyMember: boolean;
  accessMode: GameAccessMode;
  joinRequestStatus: GameJoinRequestStatus | null;
};

export async function resolveGameJoinPreview(
  userId: string,
  inviteCodeRaw: string,
): Promise<{ preview: GameJoinPreview } | { error: string }> {
  const trimmed = inviteCodeRaw.trim();
  if (!trimmed) {
    return { error: "Введите invite-код." };
  }

  const formatError = validateInviteCodeFormat(trimmed);
  if (formatError) return { error: formatError };

  const game = await findGameByInviteCode(trimmed);
  if (!game) {
    return { error: "Турнир с таким invite-кодом не найден. Проверьте код." };
  }

  const details = await prisma.game.findUnique({
    where: { id: game.id },
    select: {
      id: true,
      title: true,
      inviteCode: true,
      accessMode: true,
      scoringRule: { select: { title: true } },
      createdBy: { select: { name: true } },
      participants: {
        where: { role: GameParticipantRole.ORGANIZER },
        orderBy: { joinedAt: "asc" },
        select: { displayName: true },
      },
      _count: { select: { participants: true } },
    },
  });

  if (!details) {
    return { error: "Турнир с таким invite-кодом не найден. Проверьте код." };
  }

  const [existing, joinRequest] = await Promise.all([
    prisma.gameParticipant.findUnique({
      where: {
        gameId_userId: { gameId: details.id, userId },
      },
      select: { id: true },
    }),
    prisma.gameJoinRequest.findUnique({
      where: {
        gameId_userId: { gameId: details.id, userId },
      },
      select: { status: true },
    }),
  ]);

  const organizerName = formatGameOrganizersLine(
    getGameOrganizerDisplayNames(details),
  ).text;

  return {
    preview: {
      gameId: details.id,
      title: details.title,
      inviteCode: details.inviteCode,
      organizerName,
      scoringRuleTitle: details.scoringRule.title,
      participantsCount: details._count.participants,
      alreadyMember: existing !== null,
      accessMode: details.accessMode,
      joinRequestStatus: joinRequest?.status ?? null,
    },
  };
}

/** Нормализованный код для скрытого поля подтверждения вступления. */
export function normalizeInviteForJoin(inviteCodeRaw: string): string {
  return normalizeInviteCodeInput(inviteCodeRaw.trim());
}
