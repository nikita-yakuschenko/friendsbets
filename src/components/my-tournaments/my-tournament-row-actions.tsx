"use client";

import Link from "next/link";
import { DeleteTournamentButton } from "@/components/my-tournaments/delete-tournament-button";
import { LeaveGameButton } from "@/components/my-tournaments/leave-game-button";
import { SetActiveTournamentButton } from "@/components/my-tournaments/set-active-tournament-button";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import { gamePath } from "@/lib/game-path";
import { cn } from "@/lib/utils";

const actionLinkClass =
  "text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/60 rounded-sm";

export function MyTournamentRowActions({ game }: { game: MyTournamentRow }) {
  return (
    <div className="flex flex-col items-start gap-1.5 py-0.5 lg:items-end">
      <Link
        href={gamePath(game.inviteCode)}
        className={cn(actionLinkClass, "text-brand-lime")}
      >
        Открыть
      </Link>
      {game.canSetAsActive ? (
        <SetActiveTournamentButton
          inviteCode={game.inviteCode}
          gameTitle={game.title}
          className={cn(actionLinkClass, "text-brand-cyan hover:text-brand-lime")}
        />
      ) : null}
      {game.canDelete ? (
        <DeleteTournamentButton
          gameId={game.id}
          gameTitle={game.title}
          inviteCode={game.inviteCode}
          isActive={game.isActive}
          otherTournaments={game.otherTournaments}
          className={cn(actionLinkClass, "text-brand-red hover:text-brand-red/80")}
        />
      ) : game.canLeave ? (
        <LeaveGameButton
          gameId={game.id}
          gameTitle={game.title}
          isActive={game.isActive}
          otherTournaments={game.otherTournaments}
          className={cn(actionLinkClass, "text-brand-red hover:text-brand-red/80")}
        />
      ) : null}
    </div>
  );
}
