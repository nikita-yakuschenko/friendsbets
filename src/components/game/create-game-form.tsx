"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateRandomInviteCode } from "@/lib/invite-code";
import type { CreateGameMode } from "@/lib/tournament-templates";
import { ScoringRuleDescription } from "@/components/scoring/scoring-rule-description";
import { cn } from "@/lib/utils";
import { CreateTournamentSubmit } from "@/components/game/create-tournament-submit";
import { createGameAction } from "@/server/actions/create-game";
import type { ActionResult } from "@/server/actions/auth";

type ScoringOption = {
  id: string;
  title: string;
  code: string;
};

type TournamentTemplateOption = {
  id: string;
  title: string;
  description: string;
  isSystem: boolean;
  matchCount: number | null;
};

const CHAMPIONAT_URL_EXAMPLE =
  "https://www.championat.com/football/_worldcup/tournament/6858/calendar/";

export function CreateGameForm({
  scoringRules,
  tournamentTemplates,
  defaultTemplateId,
  isPlatformSuperadmin = false,
}: {
  scoringRules: ScoringOption[];
  tournamentTemplates: TournamentTemplateOption[];
  defaultTemplateId: string;
  isPlatformSuperadmin?: boolean;
}) {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(createGameAction, undefined);

  const [createMode, setCreateMode] = useState<CreateGameMode>("template");
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [scoringRuleId, setScoringRuleId] = useState(scoringRules[0]?.id ?? "");
  const [inviteCode, setInviteCode] = useState(() => generateRandomInviteCode());

  const selectedRule = scoringRules.find((rule) => rule.id === scoringRuleId);
  const selectedTemplate = tournamentTemplates.find((t) => t.id === templateId);

  if (scoringRules.length === 0) {
    return (
      <Alert className="border-brand-neutral bg-brand-bg text-brand-muted">
        <AlertDescription>
          <div className="space-y-2">
          {isPlatformSuperadmin ? (
            <>
              <p>
                В базе нет правил начисления очков — без них турнир не создать.
                Обычно они подставляются автоматически; если видите это сообщение,
                проверьте подключение к PostgreSQL и выполните{" "}
                <code className="text-brand-cyan">npm run db:seed</code> в корне проекта.
              </p>
              <p>
                <Link href="/admin" className="font-semibold text-brand-cyan hover:underline">
                  Админка платформы
                </Link>
                {" · "}
                <button
                  type="button"
                  className="font-semibold text-brand-cyan hover:underline"
                  onClick={() => window.location.reload()}
                >
                  Обновить страницу
                </button>
              </p>
            </>
          ) : (
            <p>
              Правила начисления очков ещё не настроены на сервере. Напишите
              организатору платформы FriendsBets.
            </p>
          )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (tournamentTemplates.length === 0) {
    return (
      <Alert className="border-brand-neutral bg-brand-bg text-brand-muted">
        <AlertDescription>
          Нет шаблонов турниров. Запустите seed или создайте шаблон в профессиональном режиме.
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

      <input type="hidden" name="createMode" value={createMode} />

      <div className="space-y-2">
        <Label htmlFor="title">Название турнира</Label>
        <Input
          id="title"
          name="title"
          placeholder="Прогнозы с друзьями"
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-3">
        <Label>Режим создания</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreateMode("template")}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors",
              createMode === "template"
                ? "border-brand-lime bg-brand-lime/10 text-white"
                : "border-brand-neutral text-brand-muted hover:border-brand-neutral/80",
            )}
          >
            По шаблону
          </button>
          <button
            type="button"
            onClick={() => setCreateMode("professional")}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors",
              createMode === "professional"
                ? "border-brand-lime bg-brand-lime/10 text-white"
                : "border-brand-neutral text-brand-muted hover:border-brand-neutral/80",
            )}
          >
            Профессиональный
          </button>
        </div>

        {createMode === "template" ? (
          <div className="space-y-2">
            <p className="text-xs text-brand-muted">Выберите шаблон</p>
            <FormSelect
              id="tournamentTemplateId"
              name="tournamentTemplateId"
              required
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {tournamentTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                  {template.isSystem ? "" : " · свой"}
                </option>
              ))}
            </FormSelect>
            {(selectedTemplate?.description || selectedTemplate?.matchCount != null) && (
              <p className="text-xs text-brand-muted">
                {selectedTemplate.description}
                {selectedTemplate.description && selectedTemplate.matchCount != null
                  ? " · "
                  : ""}
                {selectedTemplate.matchCount != null
                  ? `${selectedTemplate.matchCount} матч. в базе`
                  : ""}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-brand-muted">
              Укажите ссылку на турнир Championat вручную. Можно сохранить её как шаблон для
              следующих турниров.
            </p>
            <div className="space-y-2">
              <Label htmlFor="championatUrl">Ссылка на турнир Championat</Label>
              <Input
                id="championatUrl"
                name="championatUrl"
                type="url"
                placeholder={CHAMPIONAT_URL_EXAMPLE}
                required
              />
            </div>

            <div className="space-y-3 rounded-xl border border-brand-neutral/80 bg-brand-bg/50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="saveAsTemplate"
                  value="on"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-neutral accent-brand-lime"
                />
                <span className="text-sm text-white">
                  Сохранить турнир как шаблон
                  <span className="mt-0.5 block text-xs font-normal text-brand-muted">
                    Появится в режиме «По шаблону» у всех пользователей
                  </span>
                </span>
              </label>

              {saveAsTemplate && (
                <div className="space-y-3 border-t border-brand-neutral/60 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="templateSaveTitle">Название шаблона</Label>
                    <Input
                      id="templateSaveTitle"
                      name="templateSaveTitle"
                      placeholder="Кубок России 2025"
                      required
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="templateSaveDescription">
                      Описание{" "}
                      <span className="font-normal text-brand-muted">(необязательно)</span>
                    </Label>
                    <Input
                      id="templateSaveDescription"
                      name="templateSaveDescription"
                      placeholder="Кратко для подсказки в списке"
                      maxLength={200}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="scoringRuleId">Начисление очков</Label>
        <FormSelect
          id="scoringRuleId"
          name="scoringRuleId"
          required
          value={scoringRuleId}
          onChange={(e) => setScoringRuleId(e.target.value)}
        >
          {scoringRules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.title}
            </option>
          ))}
        </FormSelect>
        {selectedRule ? <ScoringRuleDescription code={selectedRule.code} /> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite-код для друзей</Label>
        <div className="flex gap-2">
          <Input
            id="inviteCode"
            name="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="font-mono uppercase tracking-widest"
            maxLength={32}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setInviteCode(generateRandomInviteCode())}
          >
            Сгенерировать
          </Button>
        </div>
        <p className="text-xs text-brand-muted">
          По умолчанию — 6 случайных символов (A–Z, 0–9). Можно задать свой: только латиница и цифры.
        </p>
      </div>

      <CreateTournamentSubmit />
    </form>
  );
}
