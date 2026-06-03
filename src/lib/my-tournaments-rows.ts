import type { GameParticipantRole } from "@/generated/prisma/client";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import { buildRegisterInviteUrl } from "@/lib/game-invite";
import {
  canDeleteSoloOrganizerTournament,
  canLeaveGameMembership,
  formatGameOrganizersLine,
  getGameOrganizerDisplayNames,
} from "@/lib/game-organizer";
import { resolveSourceLabelForGame } from "@/lib/tournament-source-label";

export type MembershipForTournamentRow = {
  role: GameParticipantRole;
  game: {
    id: string;
    title: string;
    inviteCode: string;
    createdAt: Date;
    tournament: { externalId: string | null };
    scoringRule: { title: string };
    createdBy: { name: string };
    participants: { displayName: string }[];
    _count: { participants: number };
  };
};

/** Сборка строк таблицы «Мои турниры» без React (для page и unit-тестов). */
export function buildMyTournamentRows(params: {
  memberships: MembershipForTournamentRow[];
  activeInviteCode: string | null;
  sourceLabelByExternalId: Map<string, string>;
}): MyTournamentRow[] {
  const { memberships, activeInviteCode, sourceLabelByExternalId } = params;
  const multipleTournaments = memberships.length > 1;

  return memberships.map(({ game, role }) => {
    const organizers = formatGameOrganizersLine(
      getGameOrganizerDisplayNames(game),
    );
    const organizerCount = game.participants.length;
    const participantsCount = game._count.participants;
    const otherTournaments = memberships
      .filter((m) => m.game.id !== game.id)
      .map((m) => ({ inviteCode: m.game.inviteCode, title: m.game.title }));

    return {
      id: game.id,
      title: game.title,
      sourceLabel: resolveSourceLabelForGame(
        game.title,
        game.tournament.externalId,
        sourceLabelByExternalId,
      ),
      organizerLabel: organizers.label,
      organizerNames: organizers.text,
      inviteCode: game.inviteCode,
      inviteLinkUrl: buildRegisterInviteUrl(game.inviteCode),
      createdAt: game.createdAt.toISOString(),
      scoringRuleTitle: game.scoringRule.title,
      participantsCount,
      canLeave: canLeaveGameMembership(
        role,
        organizerCount,
        participantsCount,
      ),
      canDelete: canDeleteSoloOrganizerTournament(
        role,
        organizerCount,
        participantsCount,
      ),
      isActive: game.inviteCode === activeInviteCode,
      canSetAsActive:
        multipleTournaments && game.inviteCode !== activeInviteCode,
      otherTournaments,
    };
  });
}
