import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MissingPredictionCard } from "@/components/admin/missing-prediction-card";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
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
  if (games.length === 0) notFound();

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
  const isPlatformAdmin = isAdmin(session.role);

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
          <Card>
            <CardContent className="py-8 text-center text-brand-muted">
              Нет предстоящих матчей или все сделали прогнозы.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
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
