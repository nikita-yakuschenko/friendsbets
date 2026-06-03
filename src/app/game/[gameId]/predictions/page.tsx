import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { gamePath } from "@/lib/game-path";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { MatchPredictionCard } from "@/components/prediction/match-prediction-card";
import { PredictionsFilterTabs } from "@/components/prediction/predictions-filter-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { gamePlatformViewPath, isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
import {
  emptyPredictionsFilterCounts,
  matchPredictionsFilter,
  parsePredictionsFilter,
  resolvePredictionsEmptyMessage,
  type PredictionsFilterId,
} from "@/lib/predictions-match-filter";
import {
  buildPredictionStageGroups,
  partitionUpcomingPredictionItems,
  type PredictionMatchItem,
} from "@/lib/predictions-list";
import { getPredictionsPageData } from "@/server/actions/predictions";

function countByFilter(
  items: { match: PredictionMatchItem["match"] }[],
): Record<PredictionsFilterId, number> {
  const counts = emptyPredictionsFilterCounts();
  for (const item of items) {
    for (const id of Object.keys(counts) as PredictionsFilterId[]) {
      if (matchPredictionsFilter(item.match, id)) {
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
    matchPredictionsFilter(item.match, activeFilter),
  );
  const liveHref = gamePath(data.game.inviteCode, "live");

  const { inProgress: inProgressItems, upcoming: upcomingOnlyItems } =
    activeFilter === "upcoming"
      ? partitionUpcomingPredictionItems(filteredItems)
      : { inProgress: [] as PredictionMatchItem[], upcoming: filteredItems };

  const stageGroups = buildPredictionStageGroups(
    activeFilter === "upcoming" ? upcomingOnlyItems : filteredItems,
  );

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

      {activeFilter === "upcoming" && counts.postponed > 0 ? (
        <div className="mb-4 space-y-2 text-sm text-brand-muted">
          {counts.postponed > 0 ? (
            <p>
              Перенесённых матчей:{" "}
              <span className="font-medium text-white">{counts.postponed}</span>.{" "}
              <Link
                href={`${gamePath(data.game.inviteCode, "predictions")}?view=postponed`}
                className="text-brand-lime underline-offset-2 hover:underline"
              >
                Открыть вкладку «Перенесённые»
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {inProgressItems.length === 0 && stageGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-brand-muted">
            {resolvePredictionsEmptyMessage(activeFilter, data.items)}
          </CardContent>
        </Card>
      ) : (
        <div className="min-w-0 space-y-8">
          {inProgressItems.length > 0 ? (
            <div className="min-w-0 space-y-4">
              {inProgressItems.map((item) => (
                <MatchPredictionCard
                  key={item.match.id}
                  gameId={data.game.id}
                  match={item.match}
                  canPredict={item.canPredict}
                  prediction={item.prediction}
                  locked={item.locked}
                  postponed={item.postponed}
                  inProgress={item.inProgress}
                  liveHref={liveHref}
                  points={item.points}
                />
              ))}
            </div>
          ) : null}
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
                    postponed={item.postponed}
                    inProgress={item.inProgress}
                    liveHref={liveHref}
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
