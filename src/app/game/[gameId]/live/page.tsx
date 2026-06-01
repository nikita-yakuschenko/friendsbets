import { notFound } from "next/navigation";
import { LiveMatchCard } from "@/components/game/live-match-card";
import { NextMatchEmpty, NextMatchPreview } from "@/components/game/next-match-preview";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { gamePath } from "@/lib/game-access";
import { getSession } from "@/lib/auth";
import { getGameOverview, getLiveMatches } from "@/server/actions/games";

export const revalidate = 30;

export default async function LivePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId } = await params;

  const [items, overview] = await Promise.all([
    getLiveMatches(gameId),
    getGameOverview(gameId, session.id),
  ]);

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

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map(({ match, myPrediction, friendPredictions, stats }) => (
            <LiveMatchCard
              key={match.id}
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
