import {
  AdminCardDetails,
  AdminCardTitle,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import { AdminPanelActions } from "@/components/admin/admin-panel-actions";
import { SyncChampionatButton } from "@/components/admin/sync-championat-button";
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
    <div className="space-y-4">
      <AdminPanelActions>
        <SyncChampionatButton />
      </AdminPanelActions>

      <AdminRecordCard>
        <header>
          <AdminCardTitle as="h3">Championat</AdminCardTitle>
        </header>
        <AdminCardDetails>
          <AdminDetailRow label="Tournament ID">
            <span className="font-mono">{integration.championat.tournamentId}</span>
          </AdminDetailRow>
          <AdminDetailRow label="Sport slug">
            <span className="font-mono">{integration.championat.sportSlug}</span>
          </AdminDetailRow>
          <AdminDetailRow label="Календарь">
            <a
              href={integration.championat.calendarUrl}
              className="break-all text-brand-lime hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {integration.championat.calendarUrl}
            </a>
          </AdminDetailRow>
          <AdminDetailRow label="Внешний ID">
            <span className="break-all font-mono text-brand-muted">
              {integration.championat.tournamentExternalId}
            </span>
          </AdminDetailRow>
          {integration.championat.dbTournamentId ? (
            <AdminDetailRow label="ID в БД">
              <span className="font-mono text-brand-muted">
                {integration.championat.dbTournamentId}
              </span>
            </AdminDetailRow>
          ) : null}
        </AdminCardDetails>
      </AdminRecordCard>

      <AdminRecordCard>
        <header>
          <AdminCardTitle as="h3">Cron API</AdminCardTitle>
        </header>
        <AdminCardDetails>
          <AdminDetailRow label="Авторизация">
            <span className="font-mono">Authorization: Bearer CRON_SECRET</span>
          </AdminDetailRow>
          <AdminDetailRow label="Секрет">
            <Badge variant={integration.cron.hasSecret ? "default" : "destructive"}>
              {integration.cron.hasSecret ? "CRON_SECRET задан" : "CRON_SECRET не задан"}
            </Badge>
          </AdminDetailRow>
          <AdminDetailRow label="Синхронизация">
            <span className="break-all font-mono">
              GET {cronBase}
              {integration.cron.syncMatchesPath}
            </span>
          </AdminDetailRow>
          <AdminDetailRow label="Напоминания">
            <span className="break-all font-mono">
              GET {cronBase}
              {integration.cron.predictionRemindersPath}
            </span>
          </AdminDetailRow>
        </AdminCardDetails>
      </AdminRecordCard>

      <AdminRecordCard>
        <header>
          <AdminCardTitle as="h3">Прочее</AdminCardTitle>
        </header>
        <AdminCardDetails>
          <AdminDetailRow label="URL приложения">
            <span className="break-all font-mono">{integration.appUrl}</span>
          </AdminDetailRow>
          <AdminDetailRow label="Прокси флагов">
            <span className="break-all font-mono">{integration.flagsApiPath}</span>
          </AdminDetailRow>
        </AdminCardDetails>
      </AdminRecordCard>
    </div>
  );
}
