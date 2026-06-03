import { notFound } from "next/navigation";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { PlatformOversightBackButton } from "@/components/game/platform-oversight-back-button";
import { LiveMatchCard } from "@/components/game/live-match-card";
import { NextMatchEmpty, NextMatchPreview } from "@/components/game/next-match-preview";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { gamePath } from "@/lib/game-path";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
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
            {items.map(({ match, friendPredictions, stats }) => (
              <LiveMatchCard
                key={match.id}
                matchId={match.id}
                match={match}
                friendPredictions={friendPredictions}
                stats={stats}
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
    nextMatchHasPrediction,
    nextMatchPrediction,
  } = overview;

  return (
    <ContentContainer>
      <PageHeader title="Лайв" />

      {items.length === 0 ? (
        <div className="mb-4">
          {nextMatch ? (
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
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map(({ match, myPrediction, friendPredictions, stats }) => (
            <LiveMatchCard
              key={match.id}
              matchId={match.id}
              match={match}
              myPrediction={myPrediction}
              friendPredictions={friendPredictions}
              stats={stats}
            />
          ))}
        </div>
      ) : null}
    </ContentContainer>
  );
}
