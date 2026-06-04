import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const { token } = await searchParams;

  if (!token?.trim()) {
    return (
      <AuthLayout title="Сброс пароля" subtitle="Ссылка недействительна или устарела.">
        <p className="text-center text-sm text-brand-muted">
          <Link
            href="/forgot-password"
            className="font-semibold text-brand-lime hover:underline"
          >
            Запросить сброс пароля
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Новый пароль"
      subtitle="Придумайте пароль не короче 6 символов."
    >
      <ResetPasswordForm token={token.trim()} />
    </AuthLayout>
  );
}
