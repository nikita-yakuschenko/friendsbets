import { redirect } from "next/navigation";
import { JoinGameForm } from "@/components/game/join-game-form";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getGameJoinPreviewForUser } from "@/server/actions/join-game";

export default async function JoinGamePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  const session = await getSession();
  if (!session) {
    const params = new URLSearchParams({ register: "1" });
    if (invite) params.set("invite", invite);
    redirect(`/?${params.toString()}`);
  }

  const initialPreview = invite
    ? await getGameJoinPreviewForUser(session.id, invite)
    : null;

  return (
    <AppShell user={session}>
      <ContentContainer className="max-w-xl">
        <PageHeader
          title="Найти турнир"
          description="Введите invite-код, проверьте название и организатора — и только потом вступайте."
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
