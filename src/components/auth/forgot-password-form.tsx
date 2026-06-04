"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/server/actions/password-reset";
import type { ActionResult } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(requestPasswordResetAction, undefined);

  if (state?.success && state.message) {
    return (
      <div className="space-y-5">
        <Alert className="border-brand-lime/30 bg-brand-lime/10 text-brand-lime">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <p className="text-center text-sm text-brand-muted">
          <Link href="/" className="font-semibold text-brand-lime hover:underline">
            На главную
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email" variant="brand">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          variant="brand"
          autoComplete="email"
          required
        />
      </div>
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Отправляем..." : "Отправить ссылку"}
      </Button>
      <p className="text-center text-sm text-brand-muted">
        <Link href="/" className="font-semibold text-brand-lime hover:underline">
          Назад ко входу
        </Link>
      </p>
    </form>
  );
}
