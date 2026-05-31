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
  gameId,
  homeScore,
  awayScore,
  label,
}: {
  matchId: string;
  gameId: string;
  homeScore: number | null;
  awayScore: number | null;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(updateMatchResultAction, undefined);

  useEffect(() => {
    if (state?.success) toast.success("Результат сохранён");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-brand-neutral bg-brand-bg p-4">
      <p className="font-medium">{label}</p>
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="gameId" value={gameId} />
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
        Сохранить результат
      </Button>
    </form>
  );
}
