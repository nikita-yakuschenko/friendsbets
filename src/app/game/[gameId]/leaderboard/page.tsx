import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  LeaderboardScoringLegend,
  LeaderboardTable,
} from "@/components/leaderboard/leaderboard-list";
import { Card, CardContent } from "@/components/ui/card";
import { getScoringRuleLegendItems } from "@/lib/scoring/catalog";
import { getSession } from "@/lib/auth";
import { getLeaderboardData } from "@/server/actions/games";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId } = await params;
  const data = await getLeaderboardData(gameId);
  if (!data) return notFound();

  const legendItems = getScoringRuleLegendItems(data.scoringRuleCode);

  return (
    <ContentContainer>
      <PageHeader title="Таблица" />

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
