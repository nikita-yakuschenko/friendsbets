import { redirect } from "next/navigation";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";
import { userNeedsEmailVerification } from "@/lib/email-verification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  if (!userNeedsEmailVerification(session)) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <AuthLayout
      title="Подтвердите почту"
      subtitle="Один шаг — и можно переходить к турнирам и прогнозам."
    >
      <VerifyEmailPanel email={session.email} errorCode={error} />
    </AuthLayout>
  );
}
