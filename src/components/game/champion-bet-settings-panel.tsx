"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { TeamLabel } from "@/components/team/team-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTimeMoscow } from "@/lib/utils";
import { updateChampionBetSettingsAction } from "@/server/actions/update-champion-bet-settings";
import type { ActionResult } from "@/server/actions/auth";

type ChampionBetSettingsPanelProps = {
  gameId: string;
  enabled: boolean;
  points: number | null;
  playoffStarted: boolean;
  firstPlayoffStart: Date | string | null;
  missingParticipants: Array<{ userId: string; displayName: string }>;
  picks: Array<{
    userId: string;
    displayName: string;
    teamName: string;
    teamCountryCode: string | null;
  }>;
};

export function ChampionBetSettingsPanel({
  gameId,
  enabled,
  points,
  playoffStarted,
  firstPlayoffStart,
  missingParticipants,
  picks,
}: ChampionBetSettingsPanelProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(updateChampionBetSettingsAction, undefined);

  const prevState = useRef<typeof state>(undefined);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;
    if (state?.success) {
      toast.success(state.message ?? "Сохранено");
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const lockLabel = firstPlayoffStart
    ? formatDateTimeMoscow(new Date(firstPlayoffStart))
    : "после появления расписания плей-офф";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ставка на чемпиона</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="gameId" value={gameId} />
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="championBetEnabled"
                defaultChecked={enabled}
                disabled={playoffStarted || pending}
                className="h-4 w-4 rounded border-brand-neutral accent-brand-lime"
              />
              <span className="text-sm text-white">Включена</span>
            </label>

            <div className="space-y-1">
              <label
                htmlFor="championBetPoints"
                className="text-sm text-brand-muted"
              >
                Очки за угаданного чемпиона
              </label>
              <Input
                id="championBetPoints"
                name="championBetPoints"
                type="number"
                min={1}
                inputMode="numeric"
                defaultValue={points ?? ""}
                disabled={playoffStarted || pending}
                placeholder="Например, 10"
                className="max-w-[12rem]"
              />
            </div>

            <p className="text-xs leading-relaxed text-brand-muted">
              Участники выбирают сборную-чемпиона из команд плей-офф до{" "}
              {lockLabel}. После старта плей-офф изменить настройки нельзя.
            </p>

            {!playoffStarted ? (
              <Button type="submit" disabled={pending}>
                {pending ? "Сохранение…" : "Сохранить"}
              </Button>
            ) : (
              <p className="text-sm text-brand-muted">
                Плей-офф уже начался — настройки зафиксированы.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {enabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ставки участников</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {missingParticipants.length > 0 && !playoffStarted ? (
              <div>
                <p className="mb-2 text-brand-muted">Ещё не выбрали чемпиона:</p>
                <ul className="flex flex-wrap gap-1.5">
                  {missingParticipants.map((participant) => (
                    <li
                      key={participant.userId}
                      className="rounded-md border border-brand-neutral/80 bg-brand-surface px-2 py-0.5 text-white"
                    >
                      {participant.displayName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {picks.length === 0 ? (
              <p className="text-brand-muted">Пока никто не сделал ставку.</p>
            ) : (
              <ul className="space-y-2">
                {picks.map((pick) => (
                  <li
                    key={pick.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-bg px-3 py-2"
                  >
                    <span className="text-white">{pick.displayName}</span>
                    <TeamLabel
                      name={pick.teamName}
                      countryCode={pick.teamCountryCode}
                      flagPosition="before"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
