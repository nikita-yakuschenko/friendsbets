"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { FormSelect } from "@/components/ui/form-select";
import {
  GAME_ACCESS_MODE,
  GAME_ACCESS_MODE_LABELS,
  GAME_ACCESS_MODE_OPTIONS,
  type GameAccessModeValue,
} from "@/lib/game-access-mode";
import { updateGameAccessModeAction } from "@/server/actions/update-game-access-mode";

export function ChangeAccessModeControl({
  gameId,
  accessMode,
  canChange,
  tournamentStarted,
}: {
  gameId: string;
  accessMode: GameAccessModeValue;
  canChange: boolean;
  tournamentStarted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canChange) {
    return (
      <div className="min-w-0">
        <p className="text-sm text-white">
          {GAME_ACCESS_MODE_LABELS[accessMode]}
        </p>
        {tournamentStarted ? (
          <p className="mt-0.5 text-xs text-brand-muted">Турнир уже начался</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1">
      <FormSelect
        id={`access-${gameId}`}
        value={accessMode}
        disabled={pending}
        className="h-9 min-w-36 max-w-full text-sm"
        onChange={(event) => {
          const next = event.target.value;
          if (!next || next === accessMode) return;
          startTransition(async () => {
            const result = await updateGameAccessModeAction(gameId, next);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success(result.message ?? "Режим доступа обновлён");
            router.refresh();
          });
        }}
      >
        {GAME_ACCESS_MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FormSelect>
      <p className="text-xs text-brand-muted">
        {accessMode === GAME_ACCESS_MODE.REQUEST
          ? "Вступление по заявке"
          : "Вступление по invite-коду"}
      </p>
    </div>
  );
}
