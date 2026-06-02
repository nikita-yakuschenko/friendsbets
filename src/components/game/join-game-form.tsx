"use client";

import { useActionState, useEffect, useState } from "react";
import { JoinGamePreviewCard } from "@/components/game/join-game-preview-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameJoinPreview } from "@/lib/join-game-preview";
import type { ActionResult } from "@/server/actions/auth";
import {
  confirmJoinGameAction,
  lookupGameByInviteAction,
  type LookupGameResult,
} from "@/server/actions/join-game";

export function JoinGameForm({
  defaultInviteCode = "",
  initialPreview = null,
}: {
  defaultInviteCode?: string;
  initialPreview?: GameJoinPreview | null;
}) {
  const [preview, setPreview] = useState<GameJoinPreview | null>(initialPreview);
  const [inviteInput, setInviteInput] = useState(defaultInviteCode);

  const [lookupState, lookupAction, lookupPending] = useActionState<
    LookupGameResult | undefined,
    FormData
  >(lookupGameByInviteAction, undefined);

  const [joinState, joinAction, joinPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(confirmJoinGameAction, undefined);

  const lookupError = lookupState?.error;
  const joinError = joinState?.error;

  useEffect(() => {
    if (lookupState?.preview) {
      setPreview(lookupState.preview);
      setInviteInput(lookupState.preview.inviteCode);
    }
  }, [lookupState]);

  const resetSearch = () => {
    setPreview(null);
    setInviteInput("");
  };

  return (
    <div className="space-y-6">
      {(lookupError || joinError) && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{lookupError ?? joinError}</AlertDescription>
        </Alert>
      )}

      {!preview ? (
        <form action={lookupAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite-код турнира</Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="ABC123"
              className="font-mono uppercase tracking-widest"
              required
              autoComplete="off"
            />
            <p className="text-xs text-brand-muted">
              Сначала найдите турнир — вступление только после проверки названия и
              организатора.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={lookupPending}>
            {lookupPending ? "Ищем…" : "Найти турнир"}
          </Button>
        </form>
      ) : (
        <>
          <JoinGamePreviewCard
            preview={preview}
            joinPending={joinPending}
            onSearchAnother={resetSearch}
          />

          {!preview.alreadyMember && (
            <form action={joinAction} className="space-y-2">
              <input type="hidden" name="inviteCode" value={preview.inviteCode} />
              <Button type="submit" className="w-full" disabled={joinPending}>
                {joinPending ? "Вступаем…" : "Вступить в турнир"}
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
