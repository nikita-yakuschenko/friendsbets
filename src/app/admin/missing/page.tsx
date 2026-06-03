import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MissingPredictionCard } from "@/components/admin/missing-prediction-card";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ADMIN_LIST_EMPTY_CLASS } from "@/components/admin/admin-detail-row";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { isSuperadmin } from "@/lib/roles";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import {
  getAdminMissingPredictions,
  getMissingPredictionsGames,
} from "@/server/actions/admin";

export default async function AdminMissingPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const games = await getMissingPredictionsGames(session.id, session.role);
  if (games.length === 0) {
    return (
      <AppShell user={session}>
        <ContentContainer>
          <PageHeader
            title="Кто не поставил"
            description="Участники без прогноза на ближайшие матчи."
          />
          <NoGamesPrompt />
        </ContentContainer>
      </AppShell>
    );
  }

  const { game: gameParam } = await searchParams;
  const normalizedParam = gameParam ? normalizeInviteCodeInput(gameParam) : "";
  const selectedGame =
    games.find(
      (g) =>
        g.inviteCode === normalizedParam ||
        g.slug === gameParam ||
        g.id === gameParam,
    ) ?? games[0];

  const items = await getAdminMissingPredictions(selectedGame.inviteCode);
  const isPlatformAdmin = isSuperadmin(session.role);

  return (
    <AppShell
      user={session}
      gameInviteCode={selectedGame.inviteCode}
      isPlatformAdmin={isPlatformAdmin}
      canManageGame
    >
      <ContentContainer>
        <PageHeader
          title="Кто не поставил"
          description="Участники без прогноза на ближайшие матчи."
          action={
            <Link href="/admin?tab=games">
              <Button variant="secondary">← Админка</Button>
            </Link>
          }
        />

        {games.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {games.map((game) => {
              const active = game.id === selectedGame.id;
              return (
                <Link
                  key={game.id}
                  href={`/admin/missing?game=${encodeURIComponent(game.inviteCode)}`}
                >
                  <Button
                    variant={active ? "default" : "secondary"}
                    size="sm"
                    className={cn(active && "pointer-events-none")}
                  >
                    {game.title}
                  </Button>
                </Link>
              );
            })}
          </div>
        )}

        {items.length === 0 ? (
          <p className={ADMIN_LIST_EMPTY_CLASS}>
            Нет предстоящих матчей или все сделали прогнозы.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <MissingPredictionCard
                key={item.match.id}
                match={item.match}
                missingParticipants={item.missingParticipants}
                reminderText={item.reminderText}
              />
            ))}
          </div>
        )}
      </ContentContainer>
    </AppShell>
  );
}
