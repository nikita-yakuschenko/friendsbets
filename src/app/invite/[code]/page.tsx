import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";
import { userNeedsEmailVerification } from "@/lib/email-verification";
import {
  buildInvitePageMetadata,
  getInviteLandingByCode,
  normalizeInviteRouteParam,
} from "@/lib/invite-landing";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  const info = await getInviteLandingByCode(normalizeInviteRouteParam(code));
  return buildInvitePageMetadata(info);
}

export default async function InvitePage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const routeCode = normalizeInviteRouteParam(rawCode);
  const info = await getInviteLandingByCode(routeCode);

  const session = await getSession();
  if (session) {
    if (userNeedsEmailVerification(session)) {
      redirect("/verify-email");
    }
    redirect(`/join?invite=${encodeURIComponent(info?.inviteCode ?? routeCode)}`);
  }

  const inviteCode = info?.inviteCode ?? routeCode;

  const title = info
    ? `Присоединяйся к турниру «${info.gameTitle}»`
    : "Приглашение в турнир";
  const subtitle = info?.templateTitle
    ? info.templateTitle
    : info
      ? "Закрытый турнир прогнозов на футбольные матчи"
      : "Проверьте invite-код или попросите организатора отправить ссылку снова.";

  return (
    <AuthLayout title={title} subtitle={subtitle} landingBackground>
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-bg" />}
      >
        <AuthEntry initialInviteCode={inviteCode} defaultMode="register" />
      </Suspense>
    </AuthLayout>
  );
}
