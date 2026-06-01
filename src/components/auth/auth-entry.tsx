"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction, registerAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/auth";

type AuthMode = "login" | "register";

export function AuthEntry() {
  const searchParams = useSearchParams();
  const initialMode: AuthMode = searchParams.get("register") ? "register" : "login";
  const inviteFromUrl = searchParams.get("invite") ?? "";
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [loginState, loginFormAction, loginPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(loginAction, undefined);

  const [registerState, registerFormAction, registerPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(registerAction, undefined);

  const isRegister = mode === "register";
  const error = isRegister ? registerState?.error : loginState?.error;
  const pending = isRegister ? registerPending : loginPending;

  return (
    <div>
      {error && (
        <Alert className="mb-5 border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        action={isRegister ? registerFormAction : loginFormAction}
        className="space-y-5"
      >
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
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 6 : undefined}
            required
          />
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            isRegister ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div
            className={cn(
              "min-h-0",
              isRegister ? "overflow-visible" : "overflow-hidden",
            )}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" variant="brand">
                  Имя
                </Label>
                <Input
                  id="name"
                  name="name"
                  variant="brand"
                  autoComplete="name"
                  required={isRegister}
                  disabled={!isRegister}
                  tabIndex={isRegister ? 0 : -1}
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
                  placeholder="ABC123 — если пригласили в турнир"
                  defaultValue={inviteFromUrl}
                  disabled={!isRegister}
                  tabIndex={isRegister ? 0 : -1}
                  className="font-mono uppercase tracking-widest"
                  autoComplete="off"
                />
                <p className="text-xs text-brand-muted">
                  Без кода можно зарегистрироваться, создать турнир или подключиться позже.
                </p>
              </div>
            </div>
          </div>
        </div>

        {isRegister && (
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
        )}

        <Button
          type="submit"
          variant={isRegister ? "brandBlue" : "brand"}
          className="w-full"
          disabled={pending}
        >
          {pending
            ? isRegister
              ? "Регистрируем..."
              : "Входим..."
            : isRegister
              ? "Зарегистрироваться"
              : "Войти"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-brand-muted">
        {isRegister ? (
          <>
            Уже есть аккаунт?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="font-semibold text-brand-cyan hover:underline"
            >
              Войти
            </button>
          </>
        ) : (
          <>
            Нет аккаунта?{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              className="font-semibold text-brand-lime hover:underline"
            >
              Зарегистрироваться
            </button>
          </>
        )}
      </p>
    </div>
  );
}
