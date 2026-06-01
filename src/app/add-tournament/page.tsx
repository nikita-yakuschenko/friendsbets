import { redirect } from "next/navigation";
import { AddTournamentPrompt } from "@/components/game/add-tournament-prompt";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { getUserGamesState } from "@/lib/game-access";

export default async function AddTournamentPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const { hasGames, firstInviteCode } = await getUserGamesState(session.id);
  if (!hasGames) redirect("/create");

  return (
    <AppShell user={session} gameInviteCode={firstInviteCode}>
      <ContentContainer className="max-w-xl">
        <PageHeader
          title="Добавить турнир"
          description="Новый турнир или подключение к турниру друга."
        />
        <AddTournamentPrompt />
      </ContentContainer>
    </AppShell>
  );
}
