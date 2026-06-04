"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/auth";

export function LoginForm({
  onSwitchToRegister,
}: {
  onSwitchToRegister?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(loginAction, undefined);

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
      <div className="space-y-2">
        <Label htmlFor="password" variant="brand">
          Пароль
        </Label>
        <PasswordInput
          id="password"
          name="password"
          variant="brand"
          autoComplete="current-password"
          required
        />
        <p className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-lime hover:underline"
          >
            Забыли пароль?
          </Link>
        </p>
      </div>
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Входим..." : "Войти"}
      </Button>
      <p className="text-center text-sm text-brand-muted">
        Нет аккаунта?{" "}
        {onSwitchToRegister ? (
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-brand-lime hover:underline"
          >
            Зарегистрироваться
          </button>
        ) : (
          <Link href="/register" className="font-semibold text-brand-lime hover:underline">
            Зарегистрироваться
          </Link>
        )}
      </p>
    </form>
  );
}
