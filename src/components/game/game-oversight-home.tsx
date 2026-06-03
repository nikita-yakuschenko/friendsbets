import { GameParticipantRole } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getGameParticipantRoleLabel } from "@/lib/roles";

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
    role: GameParticipantRole;
    user: { email: string };
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
    (p) => p.role === GameParticipantRole.ORGANIZER,
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
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-neutral bg-brand-surface">
      <div className="flex items-center justify-between gap-3 border-b border-brand-neutral/60 bg-brand-bg px-3 py-2.5 text-xs text-brand-muted sm:px-4 sm:text-sm">
        <span>
          Участники ·{" "}
          <span className="font-medium tabular-nums text-white">
            {participants.length}
          </span>
        </span>
        <span className="font-mono text-[11px] sm:text-xs">{game.inviteCode}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-xs sm:text-sm">
          <thead className="border-b border-brand-neutral/60 bg-brand-bg text-brand-muted">
            <tr>
              <th className="w-10 px-3 py-2.5 text-left font-medium sm:px-4 sm:py-3">
                #
              </th>
              <th className="px-3 py-2.5 text-left font-medium sm:px-4 sm:py-3">
                Участник
              </th>
              <th className="hidden px-3 py-2.5 text-left font-medium md:table-cell md:px-4 md:py-3">
                Email
              </th>
              <th className="px-3 py-2.5 text-right font-medium sm:px-4 sm:py-3">
                Роль
              </th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, index) => {
              const isOrganizer = p.role === GameParticipantRole.ORGANIZER;
              return (
                <tr
                  key={`${p.user.email}-${p.joinedAt.toISOString()}`}
                  className="border-t border-brand-neutral/60"
                >
                  <td className="px-3 py-2.5 font-bold tabular-nums text-brand-lime sm:px-4 sm:py-3">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                    <span
                      className="block truncate font-medium text-white"
                      title={p.displayName}
                    >
                      {p.displayName}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-[11px] text-brand-muted md:hidden"
                      title={p.user.email}
                    >
                      {p.user.email}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-brand-muted md:table-cell md:px-4 md:py-3">
                    <span className="block truncate" title={p.user.email}>
                      {p.user.email}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-xs",
                      isOrganizer ? "text-brand-lime" : "text-brand-muted",
                    )}
                  >
                    {getGameParticipantRoleLabel(p.role)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
