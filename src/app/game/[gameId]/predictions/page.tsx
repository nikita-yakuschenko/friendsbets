import { notFound, redirect } from "next/navigation";
import { MatchStatus } from "@/generated/prisma/client";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { MatchPredictionCard } from "@/components/prediction/match-prediction-card";
import { PredictionsFilterTabs } from "@/components/prediction/predictions-filter-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { gamePlatformViewPath, isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
import {
  matchPredictionsFilter,
  parsePredictionsFilter,
  PREDICTIONS_FILTER_EMPTY,
  PREDICTIONS_FILTER_IDS,
  type PredictionsFilterId,
} from "@/lib/predictions-match-filter";
import { buildPredictionStageGroups } from "@/lib/predictions-list";
import { getPredictionsPageData } from "@/server/actions/predictions";

function countByFilter(
  items: { match: { status: string } }[],
): Record<PredictionsFilterId, number> {
  const counts = { upcoming: 0, finished: 0, all: 0 } as Record<
    PredictionsFilterId,
    number
  >;
  for (const item of items) {
    const status = item.match.status as MatchStatus;
    counts.all += 1;
    for (const id of PREDICTIONS_FILTER_IDS) {
      if (id !== "all" && matchPredictionsFilter(status, id)) {
        counts[id] += 1;
      }
    }
  }
  return counts;
}

export default async function PredictionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ view?: string; as?: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId } = await params;
  const { view: viewParam, as } = await searchParams;

  const platformView = isPlatformViewQuery(as);
  const view = await requireGameViewByRoute(gameId, platformView);
  if (view?.access.isPlatformOversight) {
    redirect(gamePlatformViewPath(view.access.game.inviteCode, "control"));
  }

  const data = await getPredictionsPageData(gameId, session.id);
  if (!data) return notFound();

  const activeFilter = parsePredictionsFilter(viewParam);
  const counts = countByFilter(data.items);

  const filteredItems = data.items.filter((item) =>
    matchPredictionsFilter(item.match.status as MatchStatus, activeFilter),
  );
  const stageGroups = buildPredictionStageGroups(filteredItems);

  return (
    <ContentContainer>
      <PageHeader
        title="Мои прогнозы"
        description={`${data.game.title} · ${data.game.scoringRule.title}`}
      />

      <PredictionsFilterTabs
        inviteCode={data.game.inviteCode}
        activeFilter={activeFilter}
        counts={counts}
      />

      {stageGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-brand-muted">
            {PREDICTIONS_FILTER_EMPTY[activeFilter]}
          </CardContent>
        </Card>
      ) : (
        <div className="min-w-0 space-y-8">
          {stageGroups.map((group) => (
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
