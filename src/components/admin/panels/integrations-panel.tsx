import { AdminPanelActions } from "@/components/admin/admin-panel-actions";
import { SyncChampionatButton } from "@/components/admin/sync-championat-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AdminIntegrationsPanel({
  integration,
}: {
  integration: {
    appUrl: string;
    championat: {
      tournamentId: number;
      sportSlug: string;
      calendarUrl: string;
      tournamentExternalId: string;
      dbTournamentId: string | null;
    };
    cron: {
      syncMatchesPath: string;
      predictionRemindersPath: string;
      hasSecret: boolean;
    };
    flagsApiPath: string;
  };
}) {
  const cronBase = integration.appUrl.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <AdminPanelActions>
        <SyncChampionatButton />
      </AdminPanelActions>

      <Card>
        <CardHeader>
          <CardTitle>Championat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="space-y-2">
            <div>
              <dt className="text-brand-muted">CHAMPIONAT_TOURNAMENT_ID</dt>
              <dd className="font-mono text-white">{integration.championat.tournamentId}</dd>
            </div>
            <div>
              <dt className="text-brand-muted">CHAMPIONAT_SPORT_SLUG</dt>
              <dd className="font-mono text-white">{integration.championat.sportSlug}</dd>
            </div>
            <div>
              <dt className="text-brand-muted">Календарь</dt>
              <dd className="break-all">
                <a
                  href={integration.championat.calendarUrl}
                  className="text-brand-lime hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {integration.championat.calendarUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-brand-muted">externalId турнира</dt>
              <dd className="font-mono text-xs text-white">
                {integration.championat.tournamentExternalId}
              </dd>
            </div>
            {integration.championat.dbTournamentId ? (
              <div>
                <dt className="text-brand-muted">CHAMPIONAT_SYNC_TOURNAMENT_ID</dt>
                <dd className="font-mono text-xs text-white">
                  {integration.championat.dbTournamentId}
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cron API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-brand-muted">
            Заголовок:{" "}
            <span className="font-mono text-white">Authorization: Bearer CRON_SECRET</span>
          </p>
          <Badge variant={integration.cron.hasSecret ? "default" : "destructive"}>
            {integration.cron.hasSecret ? "CRON_SECRET задан" : "CRON_SECRET не задан"}
          </Badge>
          <ul className="space-y-2 font-mono text-xs text-white">
            <li>
              <span className="text-brand-muted">GET </span>
              {cronBase}
              {integration.cron.syncMatchesPath}
            </li>
            <li>
              <span className="text-brand-muted">GET </span>
              {cronBase}
              {integration.cron.predictionRemindersPath}
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Прочее</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-brand-muted">Публичный URL приложения</p>
          <p className="font-mono text-white">{integration.appUrl}</p>
          <p className="text-brand-muted">Прокси флагов</p>
          <p className="font-mono text-xs text-white">{integration.flagsApiPath}</p>
        </CardContent>
      </Card>
    </div>
  );
}
