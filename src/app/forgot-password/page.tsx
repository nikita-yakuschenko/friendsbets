import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <AuthLayout
      title="Забыли пароль?"
      subtitle="Укажите email — отправим ссылку для нового пароля."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
