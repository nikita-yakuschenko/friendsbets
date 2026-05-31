import Link from "next/link";
import { redirect } from "next/navigation";
import { MatchResultForm } from "@/components/admin/match-result-form";
import { RecalculateScoresButton } from "@/components/admin/recalculate-scores-button";
import { SyncChampionatButton } from "@/components/admin/sync-championat-button";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/roles";
import { getSession } from "@/lib/auth";
import {
  getAdminDashboardData,
  getMissingPredictionsGames,
} from "@/server/actions/admin";
import { formatDateTime } from "@/lib/utils";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const manageableGames = await getMissingPredictionsGames(
    session.id,
    session.role,
  );
  if (manageableGames.length === 0) redirect("/");

  const data = await getAdminDashboardData(session.id, session.role);
  const defaultGame = data.games[0];
  const isPlatformAdmin = hasPermission(session.role, "adminPanel");

  return (
    <AppShell
      user={session}
      gameSlug={defaultGame?.slug}
      isPlatformAdmin={isPlatformAdmin}
      canManageGame
    >
      <ContentContainer>
        <PageHeader
          title="Админка"
          description="Турниры, игры, матчи и ручной ввод результатов."
          action={
            <div className="flex flex-wrap gap-2">
              <SyncChampionatButton />
              <Link
                href={
                  defaultGame
                    ? `/admin/missing?game=${encodeURIComponent(defaultGame.slug)}`
                    : "/admin/missing"
                }
              >
                <Button variant="secondary">Кто не поставил</Button>
              </Link>
              {defaultGame ? (
                <RecalculateScoresButton gameId={defaultGame.id} />
              ) : null}
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Турниры</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="rounded-xl border border-brand-neutral bg-brand-bg px-3 py-2"
                >
                  <p className="font-medium">{tournament.title}</p>
                  <Badge variant="secondary" className="mt-1">
                    {tournament.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Игры</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.games.map((game) => (
                <div
                  key={game.id}
                  className="rounded-xl border border-brand-neutral bg-brand-bg px-3 py-2"
                >
                  <p className="font-medium">{game.title}</p>
                  <p className="text-sm text-brand-muted">
                    Invite: {game.inviteCode} · {game.scoringRule.title}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Матчи и результаты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.matches.map((match) => (
              <div key={match.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {match.homeTeam.name} — {match.awayTeam.name}
                  </p>
                  <Badge variant="secondary">{match.status}</Badge>
                  <span className="text-sm text-brand-muted">
                    {formatDateTime(match.startsAt)}
                  </span>
                </div>
                {defaultGame && (
                  <MatchResultForm
                    matchId={match.id}
                    gameId={defaultGame.id}
                    homeScore={match.homeScore}
                    awayScore={match.awayScore}
                    label={`${match.tournament.title} · ${match.stage ?? "Матч"}`}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </ContentContainer>
    </AppShell>
  );
}
