import { GameOversightParticipantsTable } from "@/components/game/game-oversight-participants-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    user: { id: string; email: string };
    joinedAt: Date;
  }>;
};

export function GameOversightHome({
  data,
  activeTab,
}: {
  data: GameOversightHomeData;
  activeTab: "general" | "participants";
}) {
  const { game, participants } = data;

  if (activeTab === "participants") {
    return <GameOversightParticipantsPanel game={game} participants={participants} />;
  }

  return <GameOversightGeneralPanel game={game} participants={participants} />;
}

function GameOversightGeneralPanel({
  game,
  participants,
}: {
  game: GameOversightHomeData["game"];
  participants: GameOversightHomeData["participants"];
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
          <p>{game.tournament.title}</p>
          {game.entryFeeText ? (
            <p className="text-brand-muted">Взнос: {game.entryFeeText}</p>
          ) : null}
          <p className="text-brand-muted">
            Инвайт:{" "}
            <span className="font-mono text-white">{game.inviteCode}</span>
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
        role:
          p.role === GAME_PARTICIPANT_ROLE.ORGANIZER
            ? GAME_PARTICIPANT_ROLE.ORGANIZER
            : GAME_PARTICIPANT_ROLE.PARTICIPANT,
      }))}
    />
  );
}
