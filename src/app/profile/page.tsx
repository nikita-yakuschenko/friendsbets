import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { getProfileForUser } from "@/server/actions/profile";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getProfileForUser(session.id);

  if (!profile) redirect("/");

  return (
    <AppShell user={session}>
      <ContentContainer className="max-w-md pb-4">
        <PageHeader title="Профиль" className="mb-4" />
        <ProfileSettingsForm
          user={{
            name: profile.name,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            updatedAt: profile.updatedAt.toISOString(),
          }}
        />
      </ContentContainer>
    </AppShell>
  );
}
