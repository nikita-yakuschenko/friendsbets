import { redirect } from "next/navigation";
import { AdminTabNav } from "@/components/admin/admin-tab-nav";
import { AdminGamesPanel } from "@/components/admin/panels/games-panel";
import { AdminIntegrationsPanel } from "@/components/admin/panels/integrations-panel";
import { AdminMatchesPanel } from "@/components/admin/panels/matches-panel";
import { AdminTournamentsPanel } from "@/components/admin/panels/tournaments-panel";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { hasPermission } from "@/lib/roles";
import { parseAdminTab } from "@/lib/admin-tabs";
import { getSession } from "@/lib/auth";
import {
  getAdminDashboardData,
  getAdminIntegrationInfo,
  getMissingPredictionsGames,
} from "@/server/actions/admin";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const manageableGames = await getMissingPredictionsGames(
    session.id,
    session.role,
  );
  if (manageableGames.length === 0) {
    return (
      <AppShell user={session}>
        <ContentContainer>
          <PageHeader
            title="Админка"
            description="Управление турнирами, играми, матчами и интеграциями."
          />
          <NoGamesPrompt />
        </ContentContainer>
      </AppShell>
    );
  }

  const { tab: tabParam } = await searchParams;
  const activeTab = parseAdminTab(tabParam);

  const data = await getAdminDashboardData(session.id, session.role);
  const integration =
    activeTab === "integrations" ? await getAdminIntegrationInfo() : null;

  const defaultGame = data.games[0];
  const isPlatformAdmin = hasPermission(session.role, "adminPanel");

  return (
    <AppShell
      user={session}
      gameInviteCode={defaultGame?.inviteCode}
      isPlatformAdmin={isPlatformAdmin}
      canManageGame
    >
      <ContentContainer>
        <PageHeader
          title="Админка"
          description="Управление турнирами, играми, матчами и интеграциями."
        />

        <AdminTabNav activeTab={activeTab} />

        {activeTab === "tournaments" && (
          <AdminTournamentsPanel
            tournaments={data.tournaments}
            templates={data.templates}
          />
        )}

        {activeTab === "games" && <AdminGamesPanel games={data.games} />}

        {activeTab === "matches" && (
          <AdminMatchesPanel matches={data.matches} defaultGameId={defaultGame?.id} />
        )}

        {activeTab === "integrations" && integration && (
          <AdminIntegrationsPanel integration={integration} />
        )}
      </ContentContainer>
    </AppShell>
  );
}
