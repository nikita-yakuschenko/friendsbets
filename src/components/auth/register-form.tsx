"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { registerAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/auth";

export function RegisterForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(registerAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="name" variant="brand">
          Имя
        </Label>
        <Input id="name" name="name" variant="brand" autoComplete="name" required />
      </div>
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
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inviteCode" variant="brand">
          Invite-код турнира{" "}
          <span className="font-normal text-brand-muted">(необязательно)</span>
        </Label>
        <Input
          id="inviteCode"
          name="inviteCode"
          variant="brand"
          placeholder="ABC123 — если пригласили"
          className="font-mono uppercase tracking-widest"
          autoComplete="off"
        />
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <Button type="submit" variant="brandBlue" className="w-full" disabled={pending}>
        {pending ? "Регистрируем..." : "Зарегистрироваться"}
      </Button>
      <p className="text-center text-sm text-brand-muted">
        Уже есть аккаунт?{" "}
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-brand-cyan hover:underline"
          >
            Войти
          </button>
        ) : (
          <Link href="/login" className="font-semibold text-brand-cyan hover:underline">
            Войти
          </Link>
        )}
      </p>
    </form>
  );
}
