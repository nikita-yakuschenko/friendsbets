"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { GAME_ACCESS_MODE } from "@/lib/game-access-mode";
import { GAME_JOIN_REQUEST_STATUS } from "@/lib/notification-types";
import { JoinGamePreviewCard } from "@/components/game/join-game-preview-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameJoinPreview } from "@/lib/join-game-preview";
import type { ActionResult } from "@/server/actions/auth";
import { requestJoinGameAction } from "@/server/actions/join-request";
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
  const [dismissed, setDismissed] = useState(false);
  const [inviteInput, setInviteInput] = useState(defaultInviteCode);

  const [lookupState, lookupAction, lookupPending] = useActionState<
    LookupGameResult | undefined,
    FormData
  >(lookupGameByInviteAction, undefined);

  const [joinState, joinAction, joinPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(confirmJoinGameAction, undefined);

  const [requestState, requestAction, requestPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(requestJoinGameAction, undefined);

  useEffect(() => {
    if (!lookupState?.preview) return;
    const id = window.setTimeout(() => {
      setDismissed(false);
      setInviteInput(lookupState.preview!.inviteCode);
    }, 0);
    return () => window.clearTimeout(id);
  }, [lookupState?.preview]);

  const basePreview = dismissed ? null : (lookupState?.preview ?? initialPreview);
  const preview = useMemo(() => {
    if (!basePreview) return null;
    if (requestState?.success) {
      return {
        ...basePreview,
        joinRequestStatus: GAME_JOIN_REQUEST_STATUS.PENDING,
      };
    }
    return basePreview;
  }, [basePreview, requestState?.success]);

  const lookupError = lookupState?.error;
  const joinError = joinState?.error;
  const requestError = requestState?.error;
  const requestSuccess = requestState?.success ? requestState.message : undefined;

  const resetSearch = () => {
    setDismissed(true);
    setInviteInput("");
  };

  const isRequestMode = preview?.accessMode === GAME_ACCESS_MODE.REQUEST;
  const requestPendingStatus =
    preview?.joinRequestStatus === GAME_JOIN_REQUEST_STATUS.PENDING;
  const canSendRequest =
    isRequestMode &&
    !preview?.alreadyMember &&
    !requestPendingStatus;

  return (
    <div className="space-y-6">
      {(lookupError || joinError || requestError) && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>
            {lookupError ?? joinError ?? requestError}
          </AlertDescription>
        </Alert>
      )}

      {requestSuccess && (
        <Alert className="border-brand-lime/40 bg-brand-lime/10 text-brand-lime">
          <AlertDescription>{requestSuccess}</AlertDescription>
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
            joinPending={joinPending || requestPending}
            onSearchAnother={resetSearch}
          />

          {!preview.alreadyMember && !isRequestMode && (
            <form action={joinAction} className="space-y-2">
              <input type="hidden" name="inviteCode" value={preview.inviteCode} />
              <Button type="submit" className="w-full" disabled={joinPending}>
                {joinPending ? "Вступаем…" : "Вступить в турнир"}
              </Button>
            </form>
          )}

          {canSendRequest && (
            <form action={requestAction} className="space-y-2">
              <input type="hidden" name="inviteCode" value={preview.inviteCode} />
              <Button type="submit" className="w-full" disabled={requestPending}>
                {requestPending
                  ? "Отправляем…"
                  : "Отправить заявку на вступление"}
              </Button>
            </form>
          )}

          {isRequestMode && requestPendingStatus && (
            <p className="text-center text-sm text-brand-muted">
              Заявка на вступление ожидает ответа организатора.
            </p>
          )}
        </>
      )}
    </div>
  );
};
