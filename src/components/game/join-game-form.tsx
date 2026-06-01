"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinGameAction } from "@/server/actions/join-game";
import type { ActionResult } from "@/server/actions/auth";

export function JoinGameForm({
  defaultInviteCode = "",
}: {
  defaultInviteCode?: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(joinGameAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite-код турнира</Label>
        <Input
          id="inviteCode"
          name="inviteCode"
          defaultValue={defaultInviteCode}
          placeholder="ABC123"
          className="font-mono uppercase tracking-widest"
          required
          autoComplete="off"
        />
        <p className="text-xs text-brand-muted">
          Код выдаёт организатор турнира (латинские буквы и цифры).
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Подключаем..." : "Подключиться к турниру"}
      </Button>
    </form>
  );
}
