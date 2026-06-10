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
  partitionAllPredictionItems,
  partitionUpcomingPredictionItems,
  sortFinishedPredictionItems,
  sortPostponedPredictionItems,
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
  const liveHrefFor = (matchId: string) =>
    gamePath(data.game.inviteCode, `live/${matchId}`);

  let inProgressItems: PredictionMatchItem[] = [];
  let upcomingOnlyItems: PredictionMatchItem[] = [];
  let finishedOnlyItems: PredictionMatchItem[] = [];
  let postponedOnlyItems: PredictionMatchItem[] = [];

  if (activeFilter === "upcoming") {
    const part = partitionUpcomingPredictionItems(filteredItems);
    inProgressItems = part.inProgress;
    upcomingOnlyItems = part.upcoming;
  } else if (activeFilter === "all") {
    const part = partitionAllPredictionItems(filteredItems);
    inProgressItems = part.inProgress;
    upcomingOnlyItems = part.upcoming;
    finishedOnlyItems = part.finished;
    postponedOnlyItems = part.postponed;
  } else if (activeFilter === "finished") {
    finishedOnlyItems = sortFinishedPredictionItems(filteredItems);
  } else if (activeFilter === "postponed") {
    postponedOnlyItems = sortPostponedPredictionItems(filteredItems);
  }

  const stageGroupItems =
    activeFilter === "finished"
      ? finishedOnlyItems
      : activeFilter === "postponed"
        ? postponedOnlyItems
      : activeFilter === "upcoming" || activeFilter === "all"
        ? upcomingOnlyItems
        : filteredItems;

  const stageGroups = buildPredictionStageGroups(
    stageGroupItems,
    activeFilter === "finished" ? "finished" : "upcoming",
  );

  const finishedStageGroups =
    activeFilter === "all"
      ? buildPredictionStageGroups(finishedOnlyItems, "finished")
      : [];

  const postponedStageGroups =
    activeFilter === "all"
      ? buildPredictionStageGroups(postponedOnlyItems, "upcoming")
      : [];

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

      {inProgressItems.length === 0 &&
      stageGroups.length === 0 &&
      finishedStageGroups.length === 0 &&
      postponedStageGroups.length === 0 ? (
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
                  staleAwaitingResult={item.staleAwaitingResult}
                  liveHref={
                    item.inProgress
                      ? liveHrefFor(item.match.id)
                      : undefined
                  }
                  points={item.points}
                  scoreReason={item.scoreReason}
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
                    staleAwaitingResult={item.staleAwaitingResult}
                    liveHref={
                    item.inProgress
                      ? liveHrefFor(item.match.id)
                      : undefined
                  }
                    points={item.points}
                    scoreReason={item.scoreReason}
                  />
                ))}
              </div>
            </section>
          ))}
          {finishedStageGroups.map((group) => (
            <section key={`finished-${group.id}`} className="min-w-0 space-y-4">
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
                    staleAwaitingResult={item.staleAwaitingResult}
                    liveHref={
                    item.inProgress
                      ? liveHrefFor(item.match.id)
                      : undefined
                  }
                    points={item.points}
                    scoreReason={item.scoreReason}
                  />
                ))}
              </div>
            </section>
          ))}
          {postponedStageGroups.map((group) => (
            <section key={`postponed-${group.id}`} className="min-w-0 space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-brand-muted">
                {group.stage} · перенесённые
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
                    staleAwaitingResult={item.staleAwaitingResult}
                    liveHref={
                    item.inProgress
                      ? liveHrefFor(item.match.id)
                      : undefined
                  }
                    points={item.points}
                    scoreReason={item.scoreReason}
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
