import Link from "next/link";
import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import { ChangeAccessModeControl } from "@/components/my-tournaments/change-access-mode-control";
import { ChangeScoringRuleControl } from "@/components/my-tournaments/change-scoring-rule-control";
import { MyTournamentRowActions } from "@/components/my-tournaments/my-tournament-row-actions";
import type { MyTournamentRow, ScoringRuleOption } from "@/components/my-tournaments/types";
import {
  RecordCard,
  RecordCardDetails,
  RecordCardFooter,
  RecordDetailRow,
} from "@/components/ui/record-card";
import { gamePath } from "@/lib/game-path";

export function MyTournamentCard({
  tournament,
  scoringRules,
}: {
  tournament: MyTournamentRow;
  scoringRules: ScoringRuleOption[];
}) {
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
          <p className="mt-2 text-xs text-brand-muted">
            {tournament.organizerLabel}: {tournament.organizerNames}
          </p>
        </div>
        {tournament.isActive ? (
          <span className="shrink-0 rounded-md border border-brand-lime/70 bg-brand-lime/10 px-2 py-0.5 text-xs font-medium text-brand-lime">
            Текущий
          </span>
        ) : null}
      </header>

      <RecordCardDetails>
        <RecordDetailRow label="Приглашение">
          <InviteCodeCopyCell
            inviteCode={tournament.inviteCode}
            inviteLinkUrl={tournament.inviteLinkUrl}
            compact
          />
        </RecordDetailRow>
        <RecordDetailRow label="Участники">
          <span className="tabular-nums">{tournament.participantsCount}</span>
        </RecordDetailRow>
        <RecordDetailRow label="Очки">
          <ChangeScoringRuleControl
            gameId={tournament.id}
            scoringRuleId={tournament.scoringRuleId}
            scoringRuleTitle={tournament.scoringRuleTitle}
            canChangeTournamentSettings={tournament.canChangeTournamentSettings}
            tournamentStarted={tournament.tournamentStarted}
            scoringRules={scoringRules}
          />
        </RecordDetailRow>
        <RecordDetailRow label="Доступ">
          <ChangeAccessModeControl
            gameId={tournament.id}
            accessMode={tournament.accessMode}
            canChange={tournament.canChangeTournamentSettings}
            tournamentStarted={tournament.tournamentStarted}
          />
        </RecordDetailRow>
      </RecordCardDetails>

      <RecordCardFooter>
        <MyTournamentRowActions game={tournament} />
      </RecordCardFooter>
    </RecordCard>
  );
}
