import { Badge } from "@/components/ui/badge";
import {
  AdminCardDetails,
  AdminCardTitle,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import type { AdminTemplateRow } from "@/components/admin/tournaments/types";

export function AdminTemplateCard({ template }: { template: AdminTemplateRow }) {
  return (
    <AdminRecordCard>
      <header className="flex items-start justify-between gap-3">
        <AdminCardTitle className="min-w-0 flex-1">{template.title}</AdminCardTitle>
        {template.isSystem ? (
          <Badge
            variant="default"
            className="shrink-0 rounded-md border border-brand-lime/70 bg-brand-lime/10 text-brand-lime"
          >
            Системный
          </Badge>
        ) : null}
      </header>
      <AdminCardDetails>
        {template.description ? (
          <AdminDetailRow label="Описание">{template.description}</AdminDetailRow>
        ) : null}
        <AdminDetailRow label="Матчей">
          <span className="tabular-nums">
            {template.matchCount === null ? "—" : template.matchCount}
          </span>
        </AdminDetailRow>
      </AdminCardDetails>
    </AdminRecordCard>
  );
}
