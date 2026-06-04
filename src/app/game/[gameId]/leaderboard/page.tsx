import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  LeaderboardScoringLegend,
  LeaderboardTable,
} from "@/components/leaderboard/leaderboard-list";
import { Card, CardContent } from "@/components/ui/card";
import { getScoringRuleLegendItems } from "@/lib/scoring/catalog";
import { GameOversightShell } from "@/components/game/game-oversight-shell";
import { PlatformOversightBackButton } from "@/components/game/platform-oversight-back-button";
import { TournamentManageBackButton } from "@/components/game/tournament-manage-back-button";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { canManageGame, requireGameViewByRoute } from "@/lib/game-access";
import { getLeaderboardData } from "@/server/actions/games";

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId } = await params;
  const { as } = await searchParams;
  const view = await requireGameViewByRoute(gameId, isPlatformViewQuery(as));
  const data = await getLeaderboardData(gameId);
  if (!data || !view) return notFound();

  const legendItems = getScoringRuleLegendItems(data.scoringRuleCode);
  const platformOversight = view.access.isPlatformOversight;
  const canManage = await canManageGame(session, view.gameId);
  const showManagementShell = platformOversight || canManage;

  const leaderboardBody = (
    <>
      <LeaderboardScoringLegend
        scoringRuleTitle={data.scoringRuleTitle}
        legendItems={legendItems}
      />
      {data.rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-brand-muted">
            Участников пока нет.
          </CardContent>
        </Card>
      ) : (
        <LeaderboardTable
          rows={data.rows}
          columns={data.columns}
          currentUserId={session.id}
        />
      )}
    </>
  );

  return (
    <ContentContainer>
      <PageHeader
        title={showManagementShell ? view.access.game.title : "Таблица"}
        keepTitleOnDesktop={showManagementShell}
        action={
          showManagementShell ? (
            platformOversight ? (
              <PlatformOversightBackButton />
            ) : (
              <TournamentManageBackButton
                inviteCode={view.access.game.inviteCode}
                platformOversight={false}
              />
            )
          ) : undefined
        }
      />

      {showManagementShell ? (
        <GameOversightShell
          inviteCode={view.access.game.inviteCode}
          activeTab="leaderboard"
          platformTabLinks={platformOversight}
          bannerVariant={platformOversight ? "platform" : "organizer"}
        >
          {leaderboardBody}
        </GameOversightShell>
      ) : (
        leaderboardBody
      )}
    </ContentContainer>
  );
}

