import { Fragment } from "react";
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
  sortUpcomingPredictionsBySchedule,
  type PredictionMatchItem,
} from "@/lib/predictions-list";
import { ChampionBetPicker } from "@/components/prediction/champion-bet-picker";
import { PredictionRulesNote } from "@/components/prediction/prediction-rules-note";
import { getChampionBetParticipantData } from "@/server/actions/champion-bet";
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

function predictionStageLabel(item: PredictionMatchItem): string {
  return item.match.stage?.trim() || "Матч";
}

function ChronologicalPredictionsSection({
  items,
  gameId,
  liveHrefFor,
  sectionSuffix,
}: {
  items: PredictionMatchItem[];
  gameId: string;
  liveHrefFor: (matchId: string) => string;
  sectionSuffix?: string;
}) {
  const sorted = sortUpcomingPredictionsBySchedule(items);
  if (sorted.length === 0) return null;

  return (
    <div className="min-w-0 space-y-4">
      {sorted.map((item, index) => {
        const stage = predictionStageLabel(item);
        const prevStage =
          index > 0 ? predictionStageLabel(sorted[index - 1]!) : null;
        const showHeader = stage !== prevStage;

        return (
          <Fragment key={item.match.id}>
            {showHeader ? (
              <h2 className="pt-2 text-sm font-medium uppercase tracking-wide text-brand-muted first:pt-0">
                {sectionSuffix ? `${stage} · ${sectionSuffix}` : stage}
              </h2>
            ) : null}
            <MatchPredictionCard
              gameId={gameId}
              match={item.match}
              canPredict={item.canPredict}
              prediction={item.prediction}
              locked={item.locked}
              postponed={item.postponed}
              inProgress={item.inProgress}
              staleAwaitingResult={item.staleAwaitingResult}
              liveHref={
                item.inProgress ? liveHrefFor(item.match.id) : undefined
              }
              points={item.points}
              scoreReason={item.scoreReason}
            />
          </Fragment>
        );
      })}
    </div>
  );
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

  const [data, championBet] = await Promise.all([
    getPredictionsPageData(gameId, session.id),
    getChampionBetParticipantData(gameId, session.id),
  ]);
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

  const finishedStageGroups =
    activeFilter === "all" || activeFilter === "finished"
      ? buildPredictionStageGroups(finishedOnlyItems, "finished")
      : [];

  const showUpcomingSection =
    activeFilter === "upcoming" || activeFilter === "all";
  const showPostponedSection =
    activeFilter === "postponed" || activeFilter === "all";

  const hasListContent =
    inProgressItems.length > 0 ||
    (showUpcomingSection && upcomingOnlyItems.length > 0) ||
    (showPostponedSection && postponedOnlyItems.length > 0) ||
    finishedStageGroups.length > 0;

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

      <div className="mb-6 space-y-4">
        <PredictionRulesNote
          championBetEnabled={data.game.championBetEnabled}
          championBetPoints={data.game.championBetPoints}
        />
        {championBet ? (
          <ChampionBetPicker
            gameId={championBet.gameId}
            points={championBet.points}
            firstPlayoffStart={championBet.firstPlayoffStart}
            locked={championBet.locked}
            teams={championBet.teams}
            myPick={championBet.myPick}
          />
        ) : null}
      </div>

      {!hasListContent ? (
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
          {showUpcomingSection && upcomingOnlyItems.length > 0 ? (
            <ChronologicalPredictionsSection
              items={upcomingOnlyItems}
              gameId={data.game.id}
              liveHrefFor={liveHrefFor}
            />
          ) : null}
          {showPostponedSection && postponedOnlyItems.length > 0 ? (
            <ChronologicalPredictionsSection
              items={postponedOnlyItems}
              gameId={data.game.id}
              liveHrefFor={liveHrefFor}
              sectionSuffix="перенесённые"
            />
          ) : null}
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
        </div>
      )}
    </ContentContainer>
  );
}
