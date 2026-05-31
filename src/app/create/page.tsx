import { redirect } from "next/navigation";
import { CreateGameForm } from "@/components/game/create-game-form";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { getCreateGameFormData } from "@/server/actions/create-game";

export default async function CreateGamePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const { tournaments, scoringRules } = await getCreateGameFormData();

  return (
    <AppShell user={session}>
      <ContentContainer className="max-w-xl">
        <PageHeader
          title="Создать турнир"
          description="Привяжите игру к спортивному событию, выберите правила очков и размер взноса — мы сгенерируем invite-ссылку для друзей."
        />
        <CreateGameForm tournaments={tournaments} scoringRules={scoringRules} />
      </ContentContainer>
    </AppShell>
  );
}
