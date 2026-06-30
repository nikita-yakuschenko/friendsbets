"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { getPenaltyScoringModeLabel } from "@/lib/scoring/penalty-scoring-mode";
import { updatePenaltyScoringModeAction } from "@/server/actions/update-penalty-scoring-mode";

export function ChangePenaltyScoringControl({
  gameId,
  penaltyScoringSynthetic,
  isOrganizer,
}: {
  gameId: string;
  penaltyScoringSynthetic: boolean;
  isOrganizer: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!isOrganizer) {
    return (
      <div className="min-w-0">
        <p className="text-sm text-white">
          {getPenaltyScoringModeLabel(penaltyScoringSynthetic)}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={penaltyScoringSynthetic}
          disabled={pending}
          className="h-4 w-4 shrink-0 rounded border-brand-neutral accent-brand-lime"
          onChange={(event) => {
            const next = event.target.checked;
            startTransition(async () => {
              const result = await updatePenaltyScoringModeAction(gameId, next);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(result.message ?? "Сохранено");
              router.refresh();
            });
          }}
        />
        <span className="text-sm text-white">Альтернатива</span>
      </label>
      <p className="text-xs leading-snug text-brand-muted">
        {penaltyScoringSynthetic
          ? "Синтетический счёт (+1 гол победителю пенальти)"
          : "Классика: счёт основного времени, исход по пенальти"}
      </p>
    </div>
  );
}
