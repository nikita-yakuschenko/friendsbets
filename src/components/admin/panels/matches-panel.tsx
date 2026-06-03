import { AdminMatchesView } from "@/components/admin/matches/matches-view";
import type { AdminMatchRow } from "@/components/admin/matches/types";
import type { AdminPlatformMatchRow } from "@/lib/template-match-admin";
import type { TournamentTemplateUi } from "@/lib/tournament-templates";
import { AdminPanelActions } from "@/components/admin/admin-panel-actions";
import { RecalculateScoresButton } from "@/components/admin/recalculate-scores-button";

export function AdminMatchesPanel({
  matches,
  templates,
}: {
  matches: AdminPlatformMatchRow[];
  templates: TournamentTemplateUi[];
}) {
  const rows: AdminMatchRow[] = matches;

  return (
    <div className="space-y-4">
      <AdminPanelActions>
        <RecalculateScoresButton />
      </AdminPanelActions>

      <p className="text-sm text-brand-muted">
        Результаты относятся к шаблону календаря Championat. После сохранения счёт
        обновляется во всех турнирах пользователей, созданных на этом шаблоне.
      </p>

      <AdminMatchesView matches={rows} templates={templates} />
    </div>
  );
}
