import { notFound, redirect } from "next/navigation";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { LiveMatchCard } from "@/components/game/live-match-card";
import { LiveMatchesBackButton } from "@/components/game/live-matches-back-button";
import { PlatformOversightBackButton } from "@/components/game/platform-oversight-back-button";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
import { loadChampionatMatchEventsFromDb } from "@/lib/football-api/championat/match-event-store";
import { resolveFinishedLiveMatchRedirect } from "@/lib/finished-live-match-redirect";
import { getLiveMatches } from "@/server/actions/games";

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
  const allLive = await getLiveMatches(gameId);
  const item = allLive.find((liveItem) => liveItem.match.id === matchId) ?? null;
  if (!item) {
    const finishedUrl = await resolveFinishedLiveMatchRedirect(
      gameId,
      matchId,
      oversight,
    );
    if (finishedUrl) redirect(finishedUrl);
    return notFound();
  }

  const liveItems =
    allLive.length > 1
      ? [item, ...allLive.filter((liveItem) => liveItem.match.id !== item.match.id)]
      : [item];
  const initialEventsByMatchId = new Map(
    await Promise.all(
      liveItems.map(async (liveItem) => [
        liveItem.match.id,
        await loadChampionatMatchEventsFromDb(liveItem.match.id),
      ]),
    ),
  );
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
        <div className="space-y-4">
          {liveItems.map((liveItem) => (
            <LiveMatchCard
              key={liveItem.match.id}
              matchId={liveItem.match.id}
              initialEvents={initialEventsByMatchId.get(liveItem.match.id)}
              match={liveItem.match}
              friendPredictions={liveItem.friendPredictions}
              stats={liveItem.stats}
              statsComment={liveItem.statsComment}
              hideFriendScores
            />
          ))}
        </div>
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
      <div className="space-y-4">
        {liveItems.map((liveItem) => (
          <LiveMatchCard
            key={liveItem.match.id}
            matchId={liveItem.match.id}
            initialEvents={initialEventsByMatchId.get(liveItem.match.id)}
            match={liveItem.match}
            myPrediction={liveItem.myPrediction}
            friendPredictions={liveItem.friendPredictions}
            stats={liveItem.stats}
            statsComment={liveItem.statsComment}
          />
        ))}
      </div>
    </ContentContainer>
  );
}
