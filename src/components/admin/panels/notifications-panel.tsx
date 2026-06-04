"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { broadcastPlatformNotificationAction } from "@/server/actions/broadcast-notification";
import type { ActionResult } from "@/server/actions/auth";

export function AdminNotificationsPanel() {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(broadcastPlatformNotificationAction, undefined);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-white">Рассылка всем пользователям</h2>
        <p className="text-sm text-brand-muted">
          Сообщение появится в разделе «Уведомления» у каждого зарегистрированного
          пользователя — в том числе без турниров.
        </p>
      </div>

      {state?.error ? (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert className="border-brand-lime/40 bg-brand-lime/10 text-brand-lime">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-4 rounded-xl border border-brand-neutral bg-brand-surface/50 p-4">
        <div className="space-y-2">
          <Label htmlFor="broadcast-title">Заголовок</Label>
          <Input
            id="broadcast-title"
            name="title"
            required
            maxLength={120}
            placeholder="Например: Обновление правил"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-body">Текст</Label>
          <textarea
            id="broadcast-body"
            name="body"
            required
            maxLength={2000}
            rows={6}
            placeholder="Текст уведомления для всех пользователей…"
            className="flex min-h-32 w-full resize-y rounded-xl border border-brand-neutral bg-brand-bg px-4 py-3 text-base text-white placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Отправляем…" : "Отправить всем"}
        </Button>
      </form>
    </div>
  );
}
