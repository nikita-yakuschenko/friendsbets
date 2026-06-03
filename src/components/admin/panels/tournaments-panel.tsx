import { AdminTournamentsView } from "@/components/admin/tournaments/tournaments-view";
import type {
  AdminTemplateRow,
  AdminTournamentRow,
} from "@/components/admin/tournaments/types";
import type { TournamentTemplateUi } from "@/lib/tournament-templates";
import type { Tournament } from "@/generated/prisma/client";

type TournamentRow = Pick<Tournament, "id" | "title" | "status" | "externalId">;

function toTournamentRows(tournaments: TournamentRow[]): AdminTournamentRow[] {
  return tournaments.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    externalId: t.externalId,
  }));
}

function toTemplateRows(templates: TournamentTemplateUi[]): AdminTemplateRow[] {
  return templates.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    isSystem: t.isSystem,
    matchCount: t.matchCount,
  }));
}

export function AdminTournamentsPanel({
  tournaments,
  templates,
}: {
  tournaments: TournamentRow[];
  templates: TournamentTemplateUi[];
}) {
  return (
    <AdminTournamentsView
      tournaments={toTournamentRows(tournaments)}
      templates={toTemplateRows(templates)}
    />
  );
}
