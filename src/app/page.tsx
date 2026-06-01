import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";
import { getUserGames } from "@/lib/game-access";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { gamePath } from "@/lib/game-path";
import { Button } from "@/components/ui/button";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <AuthLayout
        title="Закрытый турнир прогнозов для друзей"
        subtitle="Регистрация, турнир по Championat или вход к друзьям по invite-коду."
      >
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-bg" />}>
          <AuthEntry />
        </Suspense>
      </AuthLayout>
    );
  }

  const memberships = await getUserGames(session.id);

  if (memberships.length === 1) {
    redirect(gamePath(memberships[0].game.inviteCode));
  }

  return (
    <AppShell user={session} gameInviteCode={memberships[0]?.game.inviteCode}>
      <ContentContainer>
        <PageHeader
          title="Мои турниры"
          description="Выберите турнир, создайте новый или подключитесь по invite-коду."
        />

        {memberships.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/create">
              <Button size="sm">Создать турнир</Button>
            </Link>
            <Link href="/join">
              <Button size="sm" variant="secondary">
                Подключиться
              </Button>
            </Link>
          </div>
        )}

        {memberships.length === 0 ? (
          <NoGamesPrompt />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {memberships.map(({ game }) => (
              <Link key={game.id} href={gamePath(game.inviteCode)}>
                <Card className="transition hover:border-brand-lime/40">
                  <CardHeader>
                    <CardTitle>{game.title}</CardTitle>
                    <p className="text-sm text-brand-muted">{game.tournament.title}</p>
                  </CardHeader>
                  <CardContent className="text-sm text-brand-muted">
                    Участников: {game._count.participants}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ContentContainer>
    </AppShell>
  );
}
