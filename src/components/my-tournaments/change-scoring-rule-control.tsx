"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { FormSelect } from "@/components/ui/form-select";
import { updateGameScoringRuleAction } from "@/server/actions/update-game-scoring-rule";
import type { ScoringRuleOption } from "@/components/my-tournaments/types";

export function ChangeScoringRuleControl({
  gameId,
  scoringRuleId,
  scoringRuleTitle,
  canChangeTournamentSettings,
  tournamentStarted,
  scoringRules,
}: {
  gameId: string;
  scoringRuleId: string;
  scoringRuleTitle: string;
  canChangeTournamentSettings: boolean;
  tournamentStarted: boolean;
  scoringRules: ScoringRuleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canChangeTournamentSettings) {
    return (
      <div className="min-w-0">
        <p className="text-sm text-white">{scoringRuleTitle}</p>
        {tournamentStarted ? (
          <p className="mt-0.5 text-xs text-brand-muted">Турнир уже начался</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1">
      <FormSelect
        id={`scoring-${gameId}`}
        value={scoringRuleId}
        disabled={pending}
        className="h-9 min-w-36 max-w-full text-sm"
        onChange={(event) => {
          const nextId = event.target.value;
          if (!nextId || nextId === scoringRuleId) return;
          startTransition(async () => {
            const result = await updateGameScoringRuleAction(gameId, nextId);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success(result.message ?? "Правила очков обновлены");
            router.refresh();
          });
        }}
      >
        {scoringRules.map((rule) => (
          <option key={rule.id} value={rule.id}>
            {rule.title}
          </option>
        ))}
      </FormSelect>
      <p className="text-xs text-brand-muted">До начала турнира</p>
    </div>
  );
}
