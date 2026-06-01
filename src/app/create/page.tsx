import Link from "next/link";
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

  const { scoringRules, tournamentTemplates, defaultTemplateId } =
    await getCreateGameFormData();

  return (
    <AppShell user={session}>
      <ContentContainer className="max-w-xl">
        <PageHeader title="Создать турнир" />
        <CreateGameForm
          scoringRules={scoringRules}
          tournamentTemplates={tournamentTemplates}
          defaultTemplateId={defaultTemplateId}
        />
        <p className="mt-6 text-center text-sm text-brand-muted">
          Уже есть invite-код?{" "}
          <Link href="/join" className="font-semibold text-brand-cyan hover:underline">
            Подключиться к турниру
          </Link>
        </p>
      </ContentContainer>
    </AppShell>
  );
}
