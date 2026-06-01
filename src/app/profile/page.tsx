import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { getUserGames } from "@/lib/game-access";
import { getProfileForUser } from "@/server/actions/profile";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [profile, memberships] = await Promise.all([
    getProfileForUser(session.id),
    getUserGames(session.id),
  ]);

  if (!profile) redirect("/");

  return (
    <AppShell
      user={session}
      gameInviteCode={memberships[0]?.game.inviteCode}
    >
      <ContentContainer className="flex flex-col items-center">
        <div className="w-full max-w-md text-center">
          <PageHeader
            title="Профиль"
            description="Имя и аватар видят друзья в турнире."
          />
        </div>
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
