import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import { RenameGameTitleButton } from "@/components/admin/rename-game-title-button";
import { GameOversightParticipantsTable } from "@/components/game/game-oversight-participants-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRegisterInviteUrl } from "@/lib/game-invite";
import {
  GAME_PARTICIPANT_ROLE,
  type GameParticipantRoleValue,
} from "@/lib/game-participant-role";

export type GameOversightHomeData = {
  game: {
    id: string;
    title: string;
    inviteCode: string;
    entryFeeText: string | null;
    tournament: { title: string };
    scoringRule: { title: string };
    createdBy: { name: string; email: string };
  };
  participants: Array<{
    displayName: string;
    role: GameParticipantRoleValue;
    user: {
      id: string;
      email: string;
      avatarUrl: string | null;
      updatedAt: Date;
    };
    joinedAt: Date;
  }>;
};

export function GameOversightHome({
  data,
  activeTab,
  canRenameGameTitle = false,
}: {
  data: GameOversightHomeData;
  activeTab: "general" | "participants";
  canRenameGameTitle?: boolean;
}) {
  const { game, participants } = data;

  if (activeTab === "participants") {
    return <GameOversightParticipantsPanel game={game} participants={participants} />;
  }

  return (
    <GameOversightGeneralPanel
      game={game}
      participants={participants}
      canRenameGameTitle={canRenameGameTitle}
    />
  );
}

function GameOversightGeneralPanel({
  game,
  participants,
  canRenameGameTitle = false,
}: {
  game: GameOversightHomeData["game"];
  participants: GameOversightHomeData["participants"];
  canRenameGameTitle?: boolean;
}) {
  const organizers = participants.filter(
    (p) => p.role === GAME_PARTICIPANT_ROLE.ORGANIZER,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Турнир</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{game.title}</p>
            {canRenameGameTitle ? (
              <RenameGameTitleButton
                gameId={game.id}
                gameTitle={game.title}
                variant="inline"
              />
            ) : null}
          </div>
          <p className="text-brand-muted">{game.tournament.title}</p>
          {game.entryFeeText ? (
            <p className="text-brand-muted">Взнос: {game.entryFeeText}</p>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-brand-muted">
            <span>Приглашение:</span>
            <InviteCodeCopyCell
              inviteCode={game.inviteCode}
              inviteLinkUrl={buildRegisterInviteUrl(game.inviteCode)}
              compact
            />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Правила очков</CardTitle>
        </CardHeader>
        <CardContent className="text-white">{game.scoringRule.title}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Организатор</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {organizers.length > 0 ? (
            organizers.map((p) => (
              <p key={p.user.email} className="text-white">
                {p.displayName}{" "}
                <span className="text-brand-muted">({p.user.email})</span>
              </p>
            ))
          ) : (
            <p className="text-white">
              {game.createdBy.name}{" "}
              <span className="text-brand-muted">({game.createdBy.email})</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GameOversightParticipantsPanel({
  game,
  participants,
}: {
  game: GameOversightHomeData["game"];
  participants: GameOversightHomeData["participants"];
}) {
  const organizerCount = participants.filter(
    (p) => p.role === GAME_PARTICIPANT_ROLE.ORGANIZER,
  ).length;

  return (
    <GameOversightParticipantsTable
      gameId={game.id}
      inviteCode={game.inviteCode}
      organizerCount={organizerCount}
      participants={participants.map((p) => ({
        userId: p.user.id,
        displayName: p.displayName,
        email: p.user.email,
        avatarUrl: p.user.avatarUrl,
        updatedAt: p.user.updatedAt,
        role:
          p.role === GAME_PARTICIPANT_ROLE.ORGANIZER
            ? GAME_PARTICIPANT_ROLE.ORGANIZER
            : GAME_PARTICIPANT_ROLE.PARTICIPANT,
      }))}
    />
  );
}
