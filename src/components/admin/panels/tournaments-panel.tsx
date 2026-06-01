import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TournamentTemplateUi } from "@/lib/tournament-templates";
import type { Tournament } from "@/generated/prisma/client";

type TournamentRow = Pick<Tournament, "id" | "title" | "status" | "externalId">;

export function AdminTournamentsPanel({
  tournaments,
  templates,
}: {
  tournaments: TournamentRow[];
  templates: TournamentTemplateUi[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Турниры в базе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournaments.length === 0 ? (
            <p className="text-sm text-brand-muted">Турниров пока нет.</p>
          ) : (
            tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-xl border border-brand-neutral bg-brand-bg px-3 py-2"
              >
                <p className="font-medium">{tournament.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{tournament.status}</Badge>
                  {tournament.externalId ? (
                    <span className="text-xs text-brand-muted">
                      {tournament.externalId}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Шаблоны для создания игр</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-brand-muted">Шаблонов нет. Запустите seed.</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-brand-neutral bg-brand-bg px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{template.title}</p>
                  {template.isSystem ? (
                    <Badge variant="default">Системный</Badge>
                  ) : null}
                </div>
                {template.description ? (
                  <p className="mt-1 text-sm text-brand-muted">{template.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-brand-muted">
                  Матчей в календаре:{" "}
                  {template.matchCount === null ? "—" : template.matchCount}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
