import { redirect } from "next/navigation";
import { AdminTabNav } from "@/components/admin/admin-tab-nav";
import { AdminGamesPanel } from "@/components/admin/panels/games-panel";
import { AdminIntegrationsPanel } from "@/components/admin/panels/integrations-panel";
import { AdminMatchesPanel } from "@/components/admin/panels/matches-panel";
import { AdminTournamentsPanel } from "@/components/admin/panels/tournaments-panel";
import { AdminNotificationsPanel } from "@/components/admin/panels/notifications-panel";
import { AdminUsersPanel } from "@/components/admin/panels/users-panel";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getAdminTabsForUser, parseAdminTab } from "@/lib/admin-tabs";
import { hasPermission } from "@/lib/roles";
import { getSession } from "@/lib/auth";
import { isTelegramConfigured } from "@/lib/telegram/config";
import {
  getAdminDashboardData,
  getAdminIntegrationInfo,
  getAdminUsers,
  getMissingPredictionsGames,
} from "@/server/actions/admin";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const isPlatformSuperadmin = hasPermission(session.role, "platformAdmin");

  const manageableGames = await getMissingPredictionsGames(
    session.id,
    session.role,
  );
  if (manageableGames.length === 0 && !isPlatformSuperadmin) {
    return (
      <AppShell user={session}>
        <ContentContainer>
          <PageHeader
            title={isPlatformSuperadmin ? "Платформа" : "Управление турниром"}
          />
          <NoGamesPrompt />
        </ContentContainer>
      </AppShell>
    );
  }

  const { tab: tabParam } = await searchParams;
  const adminTabs = getAdminTabsForUser(isPlatformSuperadmin);
  const activeTab = parseAdminTab(tabParam, isPlatformSuperadmin);

  const data = await getAdminDashboardData(session.id, session.role);
  const integration =
    activeTab === "integrations" && isPlatformSuperadmin
      ? await getAdminIntegrationInfo()
      : null;

  const users =
    activeTab === "users" && isPlatformSuperadmin ? await getAdminUsers() : null;

  const defaultGame = data.games[0];

  return (
    <AppShell
      user={session}
      gameInviteCode={defaultGame?.inviteCode}
      isPlatformAdmin={isPlatformSuperadmin}
      canManageGame={manageableGames.length > 0}
      hasGamesOrOversight={isPlatformSuperadmin || manageableGames.length > 0}
    >
      <ContentContainer>
        <PageHeader
          title={isPlatformSuperadmin ? "Платформа" : "Управление турниром"}
        />

        <AdminTabNav activeTab={activeTab} tabs={adminTabs} />

        {activeTab === "users" && users && (
          <AdminUsersPanel
            users={users}
            games={data.games.map((g) => ({
              id: g.id,
              title: g.title,
              inviteCode: g.inviteCode,
            }))}
            telegramConfigured={isTelegramConfigured()}
          />
        )}

        {activeTab === "notifications" && isPlatformSuperadmin && (
          <AdminNotificationsPanel />
        )}

        {activeTab === "tournaments" && (
          <AdminTournamentsPanel
            tournaments={data.tournaments}
            templates={isPlatformSuperadmin ? data.templates : []}
          />
        )}

        {activeTab === "games" && (
          <AdminGamesPanel
            games={data.games}
            platformOversightOpen={isPlatformSuperadmin}
          />
        )}


        {activeTab === "matches" && (
          <AdminMatchesPanel
            matches={data.matches}
            templates={data.templates}
          />
        )}

        {activeTab === "integrations" && integration && (
          <AdminIntegrationsPanel integration={integration} />
        )}
      </ContentContainer>
    </AppShell>
  );
}
