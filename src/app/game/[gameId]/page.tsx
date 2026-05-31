import Link from "next/link";
import { notFound } from "next/navigation";
import { MiniLeaderboard } from "@/components/game/mini-leaderboard";
import { NextMatchEmpty, NextMatchPreview } from "@/components/game/next-match-preview";
import { StatCard, StatValue } from "@/components/game/stat-card";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gamePath } from "@/lib/game-access";
import { getSession } from "@/lib/auth";
import { getGameOverview } from "@/server/actions/games";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId: routeParam } = await params;
  const overview = await getGameOverview(routeParam, session.id);
  if (!overview) return notFound();

  const {
    game,
    myRank,
    myRow,
    leader,
    isLeader,
    nextMatch,
    nextMatchHasPrediction,
    nextMatchPrediction,
    missingPredictionsCount,
    topLeaderboard,
  } = overview;

  return (
    <ContentContainer>
      <PageHeader
        title={game.title}
        keepTitleOnDesktop
        description={
          [
            game.tournament.title,
            game.entryFeeText ? `Взнос: ${game.entryFeeText}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
      />

      <div className="mb-4">
        {nextMatch ? (
          <NextMatchPreview
            match={nextMatch}
            hasPrediction={nextMatchHasPrediction}
            prediction={nextMatchPrediction}
            predictionsHref={gamePath(game.slug, "predictions")}
          />
        ) : (
          <NextMatchEmpty />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <StatCard label="Моё место">
          <p className="text-4xl text-brand-lime">
            <StatValue>{myRank ?? "—"}</StatValue>
            {myRow && myRank !== null && (
              <span className="ml-2 text-2xl text-brand-muted">
                (
                <StatValue className="text-brand-muted">
                  {myRow.totalPoints} очков
                </StatValue>
                )
              </span>
            )}
          </p>
          {leader && !isLeader && (
            <p className="mt-3 text-sm text-brand-muted">
              Лидер:{" "}
              <span className="text-white">{leader.displayName}</span>
              {" · "}
              {leader.totalPoints} очк.
            </p>
          )}
          {leader && isLeader && myRank === 1 && (
            <p className="mt-3 text-sm text-brand-lime">Вы лидируете</p>
          )}
        </StatCard>

        <Card className="flex h-full min-h-[11rem] flex-col overflow-hidden p-0">
          <MiniLeaderboard
            fill
            rows={topLeaderboard}
            currentUserId={session.id}
            detailsHref={gamePath(game.slug, "leaderboard")}
          />
        </Card>
      </div>

      <Card className="mt-4 hidden md:block">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant={missingPredictionsCount > 0 ? "warning" : "default"}>
              {missingPredictionsCount > 0
                ? `Не сделано прогнозов: ${missingPredictionsCount}`
                : "Все ближайшие прогнозы сделаны"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link href={gamePath(game.slug, "predictions")}>
              <Button className="w-full">Сделать прогноз</Button>
            </Link>
            <Link href={gamePath(game.slug, "leaderboard")}>
              <Button variant="secondary" className="w-full">
                Таблица
              </Button>
            </Link>
            <Link href={gamePath(game.slug, "live")}>
              <Button variant="secondary" className="w-full">
                Лайв
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </ContentContainer>
  );
}
