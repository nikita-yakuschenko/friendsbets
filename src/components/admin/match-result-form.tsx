"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMatchResultAction } from "@/server/actions/admin";
import type { ActionResult } from "@/server/actions/auth";

export function MatchResultForm({
  matchId,
  homeScore,
  awayScore,
  label,
  embedded = false,
}: {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  label: string;
  embedded?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(updateMatchResultAction, undefined);

  useEffect(() => {
    if (state?.success) toast.success("Результат сохранён для шаблона");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className={embedded ? "space-y-3" : "space-y-3 rounded-xl border border-brand-neutral bg-brand-bg p-4"}
    >
      <p className="text-sm font-medium text-white">{label}</p>
      <input type="hidden" name="matchId" value={matchId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`home-${matchId}`}>Дом</Label>
          <Input
            id={`home-${matchId}`}
            name="homeScore"
            type="number"
            min={0}
            defaultValue={homeScore ?? 0}
            required
          />
        </div>
        <div>
          <Label htmlFor={`away-${matchId}`}>Гости</Label>
          <Input
            id={`away-${matchId}`}
            name="awayScore"
            type="number"
            min={0}
            defaultValue={awayScore ?? 0}
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Сохраняем…" : "Сохранить результат"}
      </Button>
    </form>
  );
}
