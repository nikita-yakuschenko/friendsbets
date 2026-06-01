import { AdminPanelActions } from "@/components/admin/admin-panel-actions";
import { MatchResultForm } from "@/components/admin/match-result-form";
import { RecalculateScoresButton } from "@/components/admin/recalculate-scores-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

type AdminMatch = {
  id: string;
  status: string;
  startsAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  stage: string | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
  tournament: { title: string };
};

export function AdminMatchesPanel({
  matches,
  defaultGameId,
}: {
  matches: AdminMatch[];
  defaultGameId?: string;
}) {
  return (
    <div className="space-y-4">
      <AdminPanelActions>
        {defaultGameId ? (
          <RecalculateScoresButton gameId={defaultGameId} />
        ) : (
          <Button size="sm" variant="secondary" disabled>
            Пересчитать очки
          </Button>
        )}
      </AdminPanelActions>

      <Card>
        <CardHeader>
          <CardTitle>Матчи и результаты</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {matches.length === 0 ? (
            <p className="text-sm text-brand-muted">Матчей нет. Синхронизируйте календарь.</p>
          ) : (
            matches.map((match) => (
              <div
                key={match.id}
                className="space-y-3 border-b border-brand-neutral/60 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {match.homeTeam.name} — {match.awayTeam.name}
                  </p>
                  <Badge variant="secondary">{match.status}</Badge>
                  <span className="text-sm text-brand-muted">
                    {formatDateTime(match.startsAt)}
                  </span>
                </div>
                {defaultGameId ? (
                  <MatchResultForm
                    matchId={match.id}
                    gameId={defaultGameId}
                    homeScore={match.homeScore}
                    awayScore={match.awayScore}
                    label={`${match.tournament.title} · ${match.stage ?? "Матч"}`}
                  />
                ) : (
                  <p className="text-sm text-brand-muted">
                    Создайте игру, чтобы вносить результаты.
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
