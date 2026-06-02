import Link from "next/link";
import { GameParticipantRole } from "@/generated/prisma/client";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gamePlatformViewPath } from "@/lib/game-platform-view";
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
  isAlsoParticipant = false,
}: {
  data: GameOversightHomeData;
  isAlsoParticipant?: boolean;
}) {
  const { game, participants } = data;
  const organizers = participants.filter(
    (p) => p.role === GameParticipantRole.ORGANIZER,
  );

  return (
    <>
      <GameOversightBanner
        inviteCode={game.inviteCode}
        isAlsoParticipant={isAlsoParticipant}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Правила очков</CardTitle>
          </CardHeader>
          <CardContent className="text-white">{game.scoringRule.title}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Участники</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-white">
            {participants.length}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
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

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Состав</CardTitle>
          <Badge variant="secondary" className="font-mono">
            {game.inviteCode}
          </Badge>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-brand-neutral/60">
            {participants.map((p) => (
              <li
                key={`${p.user.email}-${p.joinedAt.toISOString()}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <span className="font-medium text-white">{p.displayName}</span>
                  <span className="ml-2 text-brand-muted">{p.user.email}</span>
                </div>
                <Badge variant={p.role === GameParticipantRole.ORGANIZER ? "default" : "secondary"}>
                  {getGameParticipantRoleLabel(p.role)}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href={gamePlatformViewPath(game.inviteCode, "control")}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-lime px-4 text-sm font-semibold text-brand-bg"
        >
          Кто не поставил
        </Link>
        <Link
          href={gamePlatformViewPath(game.inviteCode, "leaderboard")}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-neutral px-4 text-sm font-medium text-white hover:bg-brand-neutral/30"
        >
          Таблица
        </Link>
        <Link
          href="/admin?tab=users"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-neutral px-4 text-sm font-medium text-white hover:bg-brand-neutral/30"
        >
          ← Пользователи
        </Link>
      </div>
    </>
  );
}
