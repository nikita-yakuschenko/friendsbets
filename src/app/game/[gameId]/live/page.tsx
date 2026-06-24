import { notFound } from "next/navigation";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { LiveMatchCard } from "@/components/game/live-match-card";
import { NextMatchEmpty, NextMatchPreview } from "@/components/game/next-match-preview";
import { PlatformOversightBackButton } from "@/components/game/platform-oversight-back-button";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { gamePath } from "@/lib/game-path";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
import { loadChampionatMatchEventsFromDb } from "@/lib/football-api/championat/match-event-store";
import { getGameOverview, getLiveMatches } from "@/server/actions/games";

export const revalidate = 30;

export default async function LivePage({
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
  if (!view) return notFound();

  const oversight = view.access.isPlatformOversight;
  const items = await getLiveMatches(gameId);

  // Идущие матчи показываем сразу полными карточками — без промежуточного выбора.
  const initialEventsByMatchId = new Map(
    await Promise.all(
      items.map(async (item) => {
        const events = await loadChampionatMatchEventsFromDb(item.match.id);
        return [item.match.id, events] as const;
      }),
    ),
  );

  if (oversight) {
    return (
      <ContentContainer>
        <PageHeader
          title={view.access.game.title}
          keepTitleOnDesktop
          action={<PlatformOversightBackButton />}
        />
        <GameOversightBanner />
        {items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <LiveMatchCard
                key={item.match.id}
                matchId={item.match.id}
                initialEvents={initialEventsByMatchId.get(item.match.id)}
                match={item.match}
                friendPredictions={item.friendPredictions}
                stats={item.stats}
                statsComment={item.statsComment}
                hideFriendScores
              />
            ))}
          </div>
        ) : null}
      </ContentContainer>
    );
  }

  const overview = await getGameOverview(gameId, session.id);
  if (!overview) return notFound();

  const {
    game,
    nextMatch,
    nextMatches,
    nextMatchHasPrediction,
    nextMatchPrediction,
  } = overview;

  return (
    <ContentContainer>
      <PageHeader title="Лайв" />

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <LiveMatchCard
              key={item.match.id}
              matchId={item.match.id}
              initialEvents={initialEventsByMatchId.get(item.match.id)}
              match={item.match}
              myPrediction={item.myPrediction}
              friendPredictions={item.friendPredictions}
              stats={item.stats}
              statsComment={item.statsComment}
            />
          ))}
        </div>
      ) : (
        <div className="mb-4">
          {nextMatches.length > 0 ? (
            <div className="space-y-4">
              {nextMatches.map((item, index) => (
                <NextMatchPreview
                  key={item.match.id}
                  match={item.match}
                  hasPrediction={item.hasPrediction}
                  prediction={item.prediction}
                  predictionsHref={gamePath(game.inviteCode, "predictions")}
                  showCountdown
                  heading={index === 0 ? "Ближайшие матчи" : null}
                />
              ))}
            </div>
          ) : nextMatch ? (
            <NextMatchPreview
              match={nextMatch}
              hasPrediction={nextMatchHasPrediction}
              prediction={nextMatchPrediction}
              predictionsHref={gamePath(game.inviteCode, "predictions")}
              showCountdown
            />
          ) : (
            <NextMatchEmpty />
          )}
        </div>
      )}
    </ContentContainer>
  );
}
