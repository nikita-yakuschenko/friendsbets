import Link from "next/link";
import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import { DeleteTournamentButton } from "@/components/my-tournaments/delete-tournament-button";
import { LeaveGameButton } from "@/components/my-tournaments/leave-game-button";
import { SetActiveTournamentButton } from "@/components/my-tournaments/set-active-tournament-button";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import {
  RecordCard,
  RecordCardDetails,
  RecordCardFooter,
  RecordDetailRow,
} from "@/components/ui/record-card";
import { gamePath } from "@/lib/game-path";

export function MyTournamentCard({ tournament }: { tournament: MyTournamentRow }) {
  return (
    <RecordCard>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={gamePath(tournament.inviteCode)}
            className="text-base font-medium leading-snug text-white hover:text-brand-lime"
          >
            {tournament.title}
          </Link>
          {tournament.sourceLabel ? (
            <p className="mt-1 text-sm leading-snug text-brand-muted">
              {tournament.sourceLabel}
            </p>
          ) : null}
        </div>
        {tournament.isActive ? (
          <span className="shrink-0 rounded-md border border-brand-lime/70 bg-brand-lime/10 px-2 py-0.5 text-xs font-medium text-brand-lime">
            Текущий турнир
          </span>
        ) : null}
      </header>

      <RecordCardDetails>
        <RecordDetailRow label={tournament.organizerLabel}>
          {tournament.organizerNames}
        </RecordDetailRow>
        <RecordDetailRow label="Инвайт-код">
          <InviteCodeCopyCell
            inviteCode={tournament.inviteCode}
            inviteLinkUrl={tournament.inviteLinkUrl}
            compact
          />
        </RecordDetailRow>
        <RecordDetailRow label="Участники">
          <span className="tabular-nums">{tournament.participantsCount}</span>
        </RecordDetailRow>
        <RecordDetailRow label="Правила">
          {tournament.scoringRuleTitle}
        </RecordDetailRow>
      </RecordCardDetails>

      <RecordCardFooter>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={gamePath(tournament.inviteCode)}
            className="text-sm font-medium text-brand-lime hover:underline"
          >
            Открыть
          </Link>
          {tournament.canSetAsActive ? (
            <SetActiveTournamentButton
              inviteCode={tournament.inviteCode}
              gameTitle={tournament.title}
            />
          ) : null}
        </div>
        {tournament.canDelete ? (
          <DeleteTournamentButton
            gameId={tournament.id}
            gameTitle={tournament.title}
            inviteCode={tournament.inviteCode}
            isActive={tournament.isActive}
            otherTournaments={tournament.otherTournaments}
          />
        ) : tournament.canLeave ? (
          <LeaveGameButton
            gameId={tournament.id}
            gameTitle={tournament.title}
            isActive={tournament.isActive}
            otherTournaments={tournament.otherTournaments}
          />
        ) : null}
      </RecordCardFooter>
    </RecordCard>
  );
}
