import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { AppShell } from "@/components/layout/app-shell";
import {
  ContentContainer,
  CONTENT_NARROW_MOBILE,
} from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { TelegramLinkSection } from "@/components/profile/telegram-link-section";
import { NotificationPreferencesSection } from "@/components/profile/notification-preferences-section";
import { getProfileForUser } from "@/server/actions/profile";
import { getTelegramLinkStatusForUser } from "@/server/actions/telegram";
import { isTelegramConfigured } from "@/lib/telegram/config";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [profile, telegramStatus] = await Promise.all([
    getProfileForUser(session.id),
    getTelegramLinkStatusForUser(session.id),
  ]);

  if (!profile) redirect("/");

  return (
    <AppShell user={session}>
      <ContentContainer className={cn(CONTENT_NARROW_MOBILE, "pb-4")}>
        <PageHeader title="Профиль" className="mb-4 md:mb-6" />
        <div className="mx-auto w-full max-w-xl space-y-6 md:max-w-2xl">
          <div className="rounded-xl border border-brand-neutral bg-brand-surface/50 p-4 md:p-6">
            <ProfileSettingsForm
              user={{
                name: profile.name,
                email: profile.email,
                avatarUrl: profile.avatarUrl,
                updatedAt: profile.updatedAt.toISOString(),
              }}
            />
          </div>
          <NotificationPreferencesSection
            preferences={{
              notifyByEmail: profile.notifyByEmail,
              notifyByTelegram: profile.notifyByTelegram,
              notifyInApp: profile.notifyInApp,
              emailVerified: profile.emailVerifiedAt != null,
              telegramLinked: telegramStatus.linked,
              telegramConfigured: isTelegramConfigured(),
            }}
          />
          <TelegramLinkSection status={telegramStatus} />
        </div>
      </ContentContainer>
    </AppShell>
  );
}
