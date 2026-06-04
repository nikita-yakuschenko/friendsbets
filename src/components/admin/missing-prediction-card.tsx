"use client";

import { CopyReminderButton } from "@/components/admin/copy-reminder-button";
import { SendMissingReminderButton } from "@/components/admin/send-missing-reminder-button";
import {
  AdminCardDetails,
  AdminCardFooter,
  AdminCardTitle,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import { TeamLabel } from "@/components/team/team-label";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

type MissingCardProps = {
  routeParam: string;
  inviteCode: string;
  match: {
    id: string;
    startsAt: Date;
    homeTeam: { name: string; countryCode: string | null };
    awayTeam: { name: string; countryCode: string | null };
  };
  missingParticipants: Array<{ userId: string; displayName: string }>;
  reminderText: string;
};

export function MissingPredictionCard({
  routeParam,
  inviteCode,
  match,
  missingParticipants,
  reminderText,
}: MissingCardProps) {
  return (
    <AdminRecordCard>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <AdminCardTitle as="h3" className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
            <TeamLabel
              name={match.homeTeam.name}
              countryCode={match.homeTeam.countryCode}
              flagClassName="h-4 w-5"
            />
            <span className="text-brand-muted font-normal" aria-hidden>
              —
            </span>
            <TeamLabel
              name={match.awayTeam.name}
              countryCode={match.awayTeam.countryCode}
              flagClassName="h-4 w-5"
            />
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
                  key={participant.userId}
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
        <AdminCardFooter className="flex flex-wrap items-center gap-2">
          <SendMissingReminderButton
            routeParam={routeParam}
            inviteCode={inviteCode}
            matchId={match.id}
          />
          <CopyReminderButton text={reminderText} />
        </AdminCardFooter>
      ) : null}
    </AdminRecordCard>
  );
}
