"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { TeamLabel } from "@/components/team/team-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTimeMoscow } from "@/lib/utils";
import { saveChampionBetAction } from "@/server/actions/champion-bet";
import type { ActionResult } from "@/server/actions/auth";

type ChampionBetPickerProps = {
  gameId: string;
  points: number | null;
  firstPlayoffStart: Date | string | null;
  locked: boolean;
  teams: Array<{ id: string; name: string; countryCode: string | null }>;
  myPick: {
    teamId: string;
    teamName: string;
    countryCode: string | null;
  } | null;
};

export function ChampionBetPicker({
  gameId,
  points,
  firstPlayoffStart,
  locked,
  teams,
  myPick,
}: ChampionBetPickerProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(saveChampionBetAction, undefined);

  const prevState = useRef<typeof state>(undefined);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;
    if (state?.success) {
      toast.success("Ставка на чемпиона сохранена");
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const deadline = firstPlayoffStart
    ? formatDateTimeMoscow(new Date(firstPlayoffStart))
    : null;

  return (
    <Card className="border-brand-lime/30">
      <CardHeader>
        <CardTitle className="text-base">Ставка на чемпиона</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-brand-muted">
          Выберите сборную, которая, по вашему мнению, выиграет турнир.
          {points != null ? (
            <>
              {" "}
              За верный прогноз —{" "}
              <span className="font-semibold text-brand-lime">{points}</span>{" "}
              очк.
            </>
          ) : null}
          {deadline ? (
            <>
              {" "}
              Дедлайн — до начала плей-офф ({deadline}).
            </>
          ) : null}
        </p>

        {teams.length === 0 ? (
          <p className="text-brand-muted">
            Список команд появится после жеребьёвки плей-офф.
          </p>
        ) : locked ? (
          myPick ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white">Ваш выбор:</span>
              <TeamLabel
                name={myPick.teamName}
                countryCode={myPick.countryCode}
                flagPosition="before"
                className="font-semibold"
              />
            </div>
          ) : (
            <p className="font-medium text-brand-red">
              Ставка на чемпиона не сделана — дедлайн прошёл.
            </p>
          )
        ) : (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="gameId" value={gameId} />
            <ul className="grid gap-2 sm:grid-cols-2">
              {teams.map((team) => (
                <li key={team.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-neutral/80 bg-brand-bg px-3 py-2 has-checked:border-brand-lime has-checked:bg-brand-lime/10">
                    <input
                      type="radio"
                      name="teamId"
                      value={team.id}
                      defaultChecked={myPick?.teamId === team.id}
                      disabled={pending}
                      className="accent-brand-lime"
                    />
                    <TeamLabel
                      name={team.name}
                      countryCode={team.countryCode}
                      flagPosition="before"
                    />
                  </label>
                </li>
              ))}
            </ul>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : myPick ? "Изменить ставку" : "Сделать ставку"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
