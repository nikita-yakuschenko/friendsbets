"use client";

import { CopyReminderButton } from "@/components/admin/copy-reminder-button";
import {
  AdminCardDetails,
  AdminCardFooter,
  AdminCardTitle,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

type MissingCardProps = {
  match: {
    id: string;
    startsAt: Date;
    homeTeam: { name: string };
    awayTeam: { name: string };
  };
  missingParticipants: Array<{ displayName: string }>;
  reminderText: string;
};

export function MissingPredictionCard({
  match,
  missingParticipants,
  reminderText,
}: MissingCardProps) {
  return (
    <AdminRecordCard>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <AdminCardTitle>
            {match.homeTeam.name} — {match.awayTeam.name}
          </AdminCardTitle>
        </div>
        <Badge variant="warning" className="shrink-0">
          через {formatRelativeTime(new Date(match.startsAt))}
        </Badge>
      </header>

      <AdminCardDetails>
        <AdminDetailRow label="Начало">
          <span className="text-brand-muted tabular-nums">
            {formatDateTime(new Date(match.startsAt))}
          </span>
        </AdminDetailRow>
        <AdminDetailRow label="Без прогноза">
          {missingParticipants.length === 0 ? (
            <span className="text-brand-lime">Все поставили</span>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {missingParticipants.map((participant) => (
                <li
                  key={participant.displayName}
                  className="rounded-md border border-brand-neutral/80 bg-brand-surface px-2 py-0.5 text-white"
                >
                  {participant.displayName}
                </li>
              ))}
            </ul>
          )}
        </AdminDetailRow>
      </AdminCardDetails>

      {missingParticipants.length > 0 ? (
        <AdminCardFooter>
          <CopyReminderButton text={reminderText} />
        </AdminCardFooter>
      ) : null}
    </AdminRecordCard>
  );
}
