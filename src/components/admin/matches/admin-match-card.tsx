import { MatchResultForm } from "@/components/admin/match-result-form";
import {
  AdminCardDetails,
  AdminCardFooter,
  AdminCardTitle,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import type { AdminMatchRow } from "@/components/admin/matches/types";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export function AdminMatchCard({ match }: { match: AdminMatchRow }) {
  const scoreLabel =
    match.homeScore !== null && match.awayScore !== null
      ? `${match.homeScore} : ${match.awayScore}`
      : "—";

  return (
    <AdminRecordCard>
      <header className="flex items-start justify-between gap-3">
        <AdminCardTitle className="min-w-0 flex-1">
          {match.homeTeamName} — {match.awayTeamName}
        </AdminCardTitle>
        <Badge variant="secondary" className="shrink-0">
          {match.status}
        </Badge>
      </header>

      <AdminCardDetails>
        <AdminDetailRow label="Стадия">{match.stage ?? "—"}</AdminDetailRow>
        <AdminDetailRow label="Начало">
          <span className="text-brand-muted tabular-nums">
            {formatDateTime(new Date(match.startsAt))}
          </span>
        </AdminDetailRow>
        <AdminDetailRow label="Счёт">
          <span className="tabular-nums">{scoreLabel}</span>
        </AdminDetailRow>
      </AdminCardDetails>

      <AdminCardFooter stack>
        <MatchResultForm
          matchId={match.id}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          label="Результат матча"
          embedded
        />
      </AdminCardFooter>
    </AdminRecordCard>
  );
}
