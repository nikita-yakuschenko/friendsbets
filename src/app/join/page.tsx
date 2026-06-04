import { redirect } from "next/navigation";
import { JoinGameForm } from "@/components/game/join-game-form";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getUserGamesState } from "@/lib/game-access";
import { getGameJoinPreviewForUser } from "@/server/actions/join-game";
import { normalizeInviteCodeInput } from "@/lib/invite-code";

export default async function JoinGamePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  const session = await getSession();
  if (!session) {
    if (invite?.trim()) {
      redirect(
        `/invite/${encodeURIComponent(normalizeInviteCodeInput(invite))}`,
      );
    }
    redirect("/");
  }

  const initialPreview = invite
    ? await getGameJoinPreviewForUser(session.id, invite)
    : null;

  const { hasGames } = await getUserGamesState(session.id);

  return (
    <AppShell user={session}>
      <ContentContainer className="max-w-xl">
        <PageHeader
          title={hasGames ? "Добавить турнир" : "Найти турнир"}
          description={
            hasGames
              ? "Введите invite-код — турнир появится в списке «Мои турниры»."
              : "Введите invite-код, проверьте название и организатора — и только потом вступайте."
          }
        />
        <JoinGameForm
          defaultInviteCode={invite ?? ""}
          initialPreview={initialPreview}
        />
        <p className="mt-6 text-center text-sm text-brand-muted">
          Хотите создать турнир?{" "}
          <Link href="/create" className="font-semibold text-brand-lime hover:underline">
            Создать турнир
          </Link>
        </p>
      </ContentContainer>
    </AppShell>
  );
}
