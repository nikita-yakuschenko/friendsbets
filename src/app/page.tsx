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
          <Card>
            <CardContent className="space-y-5 py-8 text-center">
              <p className="text-brand-muted">
                Вы пока не в турнире. Создайте турнир прогнозов или подключитесь по
                invite-коду от друга.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link href="/create">
                  <Button className="w-full sm:w-auto">Создать турнир</Button>
                </Link>
                <Link href="/join">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Подключиться по invite
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
