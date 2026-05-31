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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <AuthLayout
        title="Закрытый турнир прогнозов для друзей"
        subtitle="Угадывайте счёта матчей, следите за таблицей и соревнуйтесь в своей игре по invite-коду."
      >
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-bg" />}>
          <AuthEntry />
        </Suspense>
      </AuthLayout>
    );
  }

  const memberships = await getUserGames(session.id);

  if (memberships.length === 1) {
    redirect(`/game/${memberships[0].game.slug}`);
  }

  return (
    <AppShell user={session} gameSlug={memberships[0]?.game.slug}>
      <ContentContainer>
        <PageHeader
          title="Мои игры"
          description="Выберите игру или создайте свой турнир прогнозов."
        />

        {memberships.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-brand-muted">
                Вы пока не участвуете ни в одной игре. Создайте турнир или
                зарегистрируйтесь по invite-коду друга.
              </p>
              <Link href="/?register=1" className="mt-4 inline-block">
                <Button variant="secondary">У меня есть invite-код</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {memberships.map(({ game }) => (
              <Link key={game.id} href={`/game/${game.slug}`}>
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
