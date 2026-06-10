import { notFound } from "next/navigation";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { LiveMatchCard } from "@/components/game/live-match-card";
import { LiveMatchesBackButton } from "@/components/game/live-matches-back-button";
import { PlatformOversightBackButton } from "@/components/game/platform-oversight-back-button";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
import { getLiveMatch, getLiveMatches } from "@/server/actions/games";

export const revalidate = 30;

export default async function LiveMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string; matchId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId, matchId } = await params;
  const { as } = await searchParams;
  const view = await requireGameViewByRoute(gameId, isPlatformViewQuery(as));
  if (!view) return notFound();

  const oversight = view.access.isPlatformOversight;
  const item = await getLiveMatch(gameId, matchId);
  if (!item) return notFound();

  const allLive = await getLiveMatches(gameId);
  const showBackToList = allLive.length > 1;

  if (oversight) {
    return (
      <ContentContainer>
        <PageHeader
          title={view.access.game.title}
          keepTitleOnDesktop
          action={
            showBackToList ? (
              <LiveMatchesBackButton inviteCode={view.access.game.inviteCode} />
            ) : (
              <PlatformOversightBackButton />
            )
          }
        />
        <GameOversightBanner />
        <LiveMatchCard
          matchId={item.match.id}
          match={item.match}
          friendPredictions={item.friendPredictions}
          stats={item.stats}
          hideFriendScores
        />
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <PageHeader
        title="Лайв"
        action={
          showBackToList ? (
            <LiveMatchesBackButton inviteCode={view.access.game.inviteCode} />
          ) : undefined
        }
      />
      <LiveMatchCard
        matchId={item.match.id}
        match={item.match}
        myPrediction={item.myPrediction}
        friendPredictions={item.friendPredictions}
        stats={item.stats}
      />
    </ContentContainer>
  );
}
