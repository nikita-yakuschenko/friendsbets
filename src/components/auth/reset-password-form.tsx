"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPasswordAction } from "@/server/actions/password-reset";
import type { ActionResult } from "@/server/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(resetPasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="password" variant="brand">
          Новый пароль
        </Label>
        <PasswordInput
          id="password"
          name="password"
          variant="brand"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConfirm" variant="brand">
          Повторите пароль
        </Label>
        <PasswordInput
          id="passwordConfirm"
          name="passwordConfirm"
          variant="brand"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </div>
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить пароль"}
      </Button>
      <p className="text-center text-sm text-brand-muted">
        <Link
          href="/forgot-password"
          className="font-semibold text-brand-lime hover:underline"
        >
          Запросить новую ссылку
        </Link>
      </p>
    </form>
  );
}
