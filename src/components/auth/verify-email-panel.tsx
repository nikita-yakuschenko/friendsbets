"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";
import { resendVerificationEmailAction } from "@/server/actions/email-verification";

export function VerifyEmailPanel({
  email,
  errorCode,
}: {
  email: string;
  errorCode?: string | null;
}) {
  const [pending, setPending] = useState(false);

  const linkError =
    errorCode === "expired"
      ? "Ссылка истекла. Отправьте письмо ещё раз."
      : errorCode === "invalid"
        ? "Ссылка недействительна. Отправьте письмо ещё раз."
        : null;

  async function handleResend() {
    setPending(true);
    try {
      const result = await resendVerificationEmailAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.message) {
        toast.success(result.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {linkError && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{linkError}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm leading-relaxed text-brand-muted">
        Мы отправили письмо на{" "}
        <span className="font-medium text-white">{email}</span>. Откройте его и
        нажмите кнопку «Подтвердить email» — после этого откроется доступ к
        турнирам.
      </p>

      <p className="text-sm text-brand-muted">
        Пока почта не подтверждена, остальные разделы недоступны.
      </p>

      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={handleResend}
      >
        {pending ? "Отправляем…" : "Отправить письмо ещё раз"}
      </Button>

      <form action={logoutAction}>
        <Button type="submit" variant="ghost" className="w-full text-brand-muted">
          Выйти и войти другим аккаунтом
        </Button>
      </form>
    </div>
  );
}
