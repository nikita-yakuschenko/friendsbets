"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getScoringRuleHint } from "@/lib/scoring/catalog";
import { createGameAction } from "@/server/actions/create-game";
import type { ActionResult } from "@/server/actions/auth";

type TournamentOption = {
  id: string;
  title: string;
  description: string | null;
  _count: { matches: number };
};

type ScoringOption = {
  id: string;
  title: string;
  code: string;
};

export function CreateGameForm({
  tournaments,
  scoringRules,
}: {
  tournaments: TournamentOption[];
  scoringRules: ScoringOption[];
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createGameAction, undefined);

  const [scoringRuleId, setScoringRuleId] = useState(scoringRules[0]?.id ?? "");
  const selectedRule = scoringRules.find((rule) => rule.id === scoringRuleId);

  if (tournaments.length === 0) {
    return (
      <Alert className="border-brand-neutral bg-brand-bg text-brand-muted">
        <AlertDescription>
          Пока нет доступных спортивных событий с матчами. Обратитесь к администратору.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Название вашего турнира</Label>
        <Input
          id="title"
          name="title"
          placeholder="Например: Прогнозы с друзьями"
        />
        <p className="text-xs text-brand-muted">
          Необязательно. Если пусто — название соберётся из события.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tournamentId">Спортивное событие</Label>
        <select
          id="tournamentId"
          name="tournamentId"
          required
          defaultValue={tournaments[0]?.id}
          className="flex h-11 w-full rounded-xl border border-brand-neutral bg-brand-bg px-4 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        >
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.title} · {tournament._count.matches} матч.
            </option>
          ))}
        </select>
        {tournaments[0]?.description && (
          <p className="text-xs text-brand-muted">{tournaments[0].description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="scoringRuleId">Начисление очков</Label>
        <select
          id="scoringRuleId"
          name="scoringRuleId"
          required
          value={scoringRuleId}
          onChange={(e) => setScoringRuleId(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-brand-neutral bg-brand-bg px-4 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        >
          {scoringRules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.title}
            </option>
          ))}
        </select>
        {selectedRule && (
          <p className="text-xs text-brand-muted">
            {getScoringRuleHint(selectedRule.code)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="entryFeeText">Размер взноса</Label>
        <Input
          id="entryFeeText"
          name="entryFeeText"
          placeholder="500 ₽"
          required
        />
        <p className="text-xs text-brand-muted">
          Укажите сумму или условие участия — участники увидят это в игре.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Создаём..." : "Создать турнир и получить ссылку"}
      </Button>
    </form>
  );
}
