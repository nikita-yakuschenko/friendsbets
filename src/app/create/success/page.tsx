import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyInviteLink } from "@/components/game/copy-invite-link";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gamePath } from "@/lib/game-path";
import { getSession } from "@/lib/auth";
import { getCreatedGameInvite } from "@/server/actions/create-game";

export default async function CreateSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug } = await searchParams;
  if (!slug) redirect("/create");

  const invite = await getCreatedGameInvite(slug);
  if (!invite) notFound();

  const { game, inviteCode, registerUrl, gameUrl } = invite;

  return (
    <AppShell user={session} gameSlug={game.slug} canManageGame>
      <ContentContainer className="max-w-xl">
        <PageHeader
          title="Турнир создан"
          description="Отправьте пригласительную ссылку друзьям — после регистрации они попадут в вашу игру."
        />

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{game.title}</CardTitle>
            <p className="text-sm text-brand-muted">{game.tournament.title}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{game.scoringRule.title}</Badge>
              {game.entryFeeText && (
                <Badge variant="outline">Взнос: {game.entryFeeText}</Badge>
              )}
            </div>
            <p className="text-brand-muted">
              Invite-код: <span className="font-mono text-white">{inviteCode}</span>
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-white">
              Пригласительная ссылка для регистрации
            </p>
            <CopyInviteLink url={registerUrl} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-white">Ссылка на игру</p>
            <CopyInviteLink url={gameUrl} label="Копировать" />
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link href={gamePath(game.slug)}>
            <Button className="w-full">Перейти в турнир</Button>
          </Link>
          <Link href="/create">
            <Button variant="secondary" className="w-full">
              Создать ещё
            </Button>
          </Link>
        </div>
      </ContentContainer>
    </AppShell>
  );
}
