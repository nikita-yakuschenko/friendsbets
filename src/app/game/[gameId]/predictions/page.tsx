import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { MatchPredictionCard } from "@/components/prediction/match-prediction-card";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getPredictionsPageData } from "@/server/actions/predictions";

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId } = await params;
  const data = await getPredictionsPageData(gameId, session.id);
  if (!data) return notFound();

  return (
    <ContentContainer>
      <PageHeader
        title="Мои прогнозы"
        description={`${data.game.title} · ${data.game.scoringRule.title}`}
      />

      {data.items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-brand-muted">
            Матчей пока нет.
          </CardContent>
        </Card>
      ) : (
        <div className="min-w-0 space-y-8">
          {data.stageGroups.map((group) => (
            <section key={group.id} className="min-w-0 space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-brand-muted">
                {group.stage}
              </h2>
              <div className="min-w-0 space-y-4">
                {group.items.map((item) => (
                  <MatchPredictionCard
                    key={item.match.id}
                    gameId={data.game.id}
                    match={item.match}
                    canPredict={item.canPredict}
                    prediction={item.prediction}
                    locked={item.locked}
                    points={item.points}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </ContentContainer>
  );
}
