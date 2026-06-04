"use client";

import { DeleteTournamentButton } from "@/components/my-tournaments/delete-tournament-button";
import { LeaveGameButton } from "@/components/my-tournaments/leave-game-button";
import { SetActiveTournamentButton } from "@/components/my-tournaments/set-active-tournament-button";
import { TournamentActionNavLink } from "@/components/my-tournaments/tournament-action-link";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import { gamePath } from "@/lib/game-path";

export function MyTournamentRowActions({ game }: { game: MyTournamentRow }) {
  return (
    <div className="flex min-w-36 flex-col items-stretch gap-1 py-0.5">
      <TournamentActionNavLink href={gamePath(game.inviteCode)} variant="primary">
        Открыть
      </TournamentActionNavLink>
      {game.canSetAsActive ? (
        <SetActiveTournamentButton
          inviteCode={game.inviteCode}
          gameTitle={game.title}
        />
      ) : null}
      {game.canDelete ? (
        <DeleteTournamentButton
          gameId={game.id}
          gameTitle={game.title}
          inviteCode={game.inviteCode}
          isActive={game.isActive}
          otherTournaments={game.otherTournaments}
        />
      ) : game.canLeave ? (
        <LeaveGameButton
          gameId={game.id}
          gameTitle={game.title}
          isActive={game.isActive}
          otherTournaments={game.otherTournaments}
        />
      ) : null}
    </div>
  );
}
