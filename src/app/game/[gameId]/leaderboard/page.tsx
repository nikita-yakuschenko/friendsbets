import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  LeaderboardScoringLegend,
  LeaderboardTable,
} from "@/components/leaderboard/leaderboard-list";
import { Card, CardContent } from "@/components/ui/card";
import { getScoringRuleLegendItems } from "@/lib/scoring/catalog";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { OversightBackLink } from "@/components/game/oversight-back-link";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
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

  return (
    <ContentContainer>
      <PageHeader
        title="Таблица"
        action={
          view.access.isPlatformOversight ? (
            <OversightBackLink inviteCode={view.access.game.inviteCode} />
          ) : undefined
        }
      />
      {view.access.isPlatformOversight ? (
        <GameOversightBanner inviteCode={view.access.game.inviteCode} />
      ) : null}

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
    </ContentContainer>
  );
}
