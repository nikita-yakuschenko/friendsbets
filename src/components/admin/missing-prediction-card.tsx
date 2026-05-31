"use client";

import { CopyReminderButton } from "@/components/admin/copy-reminder-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>
              {match.homeTeam.name} — {match.awayTeam.name}
            </CardTitle>
            <p className="mt-1 text-sm text-brand-muted">
              {formatDateTime(new Date(match.startsAt))}
            </p>
          </div>
          <Badge variant="warning">
            через {formatRelativeTime(new Date(match.startsAt))}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingParticipants.length === 0 ? (
          <p className="text-sm text-brand-lime">Все участники сделали прогноз.</p>
        ) : (
          <ul className="space-y-2">
            {missingParticipants.map((participant) => (
              <li
                key={participant.displayName}
                className="rounded-xl bg-brand-bg px-3 py-2 text-sm text-white"
              >
                {participant.displayName}
              </li>
            ))}
          </ul>
        )}
        <CopyReminderButton text={reminderText} />
      </CardContent>
    </Card>
  );
}
