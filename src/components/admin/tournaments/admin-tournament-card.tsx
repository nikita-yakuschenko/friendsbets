import { Badge } from "@/components/ui/badge";
import {
  AdminCardDetails,
  AdminCardTitle,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import type { AdminTournamentRow } from "@/components/admin/tournaments/types";

export function AdminTournamentCard({ tournament }: { tournament: AdminTournamentRow }) {
  return (
    <AdminRecordCard>
      <header>
        <AdminCardTitle>{tournament.title}</AdminCardTitle>
      </header>
      <AdminCardDetails>
        <AdminDetailRow label="Статус">
          <Badge variant="secondary">{tournament.status}</Badge>
        </AdminDetailRow>
        {tournament.externalId ? (
          <AdminDetailRow label="Внешний ID">
            <span className="break-all font-mono text-brand-muted">
              {tournament.externalId}
            </span>
          </AdminDetailRow>
        ) : null}
      </AdminCardDetails>
    </AdminRecordCard>
  );
}
