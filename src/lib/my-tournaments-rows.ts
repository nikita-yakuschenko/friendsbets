import { GameParticipantRole } from "@/generated/prisma/client";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import { buildRegisterInviteUrl } from "@/lib/game-invite";
import {
  canDeleteSoloOrganizerTournament,
  canLeaveGameMembership,
  formatGameOrganizersLine,
  getGameOrganizerDisplayNames,
} from "@/lib/game-organizer";
import { parseGameAccessModeInput } from "@/lib/game-access-mode";
import { resolveSourceLabelForGame } from "@/lib/tournament-source-label";

export type MembershipForTournamentRow = {
  role: GameParticipantRole;
  game: {
    id: string;
    title: string;
    inviteCode: string;
    createdAt: Date;
    tournament: { externalId: string | null };
    accessMode: string;
    scoringRule: { id: string; title: string };
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
  tournamentStartedByGameId: Map<string, boolean>;
}): MyTournamentRow[] {
  const { memberships, activeInviteCode, sourceLabelByExternalId, tournamentStartedByGameId } =
    params;
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

    const isOrganizer = role === GameParticipantRole.ORGANIZER;
    const tournamentStarted = tournamentStartedByGameId.get(game.id) ?? false;

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
      scoringRuleId: game.scoringRule.id,
      scoringRuleTitle: game.scoringRule.title,
      accessMode: parseGameAccessModeInput(game.accessMode),
      isOrganizer,
      canChangeTournamentSettings: isOrganizer && !tournamentStarted,
      tournamentStarted,
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
