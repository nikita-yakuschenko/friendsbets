"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { broadcastPlatformNotificationAction } from "@/server/actions/broadcast-notification";
import type { AdminBroadcastUserOption } from "@/server/actions/admin";
import type { ActionResult } from "@/server/actions/auth";

type Audience = "all" | "organizers" | "personal";

export function AdminNotificationsPanel({
  users,
  telegramConfigured,
}: {
  users: AdminBroadcastUserOption[];
  telegramConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(broadcastPlatformNotificationAction, undefined);

  const [audience, setAudience] = useState<Audience>("all");
  const [userFilter, setUserFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, userFilter]);

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-white">Рассылка уведомлений</h2>
        <p className="text-sm text-brand-muted">
          Выберите аудиторию и каналы. Если выбран только Telegram, пользователи
          без привязки получат сообщение в разделе «Уведомления» на сайте.
          Привязанным в Telegram при выборе обоих каналов уходит только в бот.
        </p>
      </div>

      {state?.error ? (
        <Alert className="border-brand-red/40 bg-brand-red/10 text-brand-red">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert className="border-brand-lime/40 bg-brand-lime/10 text-brand-lime">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form
        action={formAction}
        className="space-y-5 rounded-xl border border-brand-neutral bg-brand-surface/50 p-4"
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-white">Кому</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
            <input
              type="radio"
              name="audience"
              value="all"
              checked={audience === "all"}
              onChange={() => setAudience("all")}
              className="accent-brand-lime"
            />
            Всем пользователям
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
            <input
              type="radio"
              name="audience"
              value="organizers"
              checked={audience === "organizers"}
              onChange={() => setAudience("organizers")}
              className="accent-brand-lime"
            />
            Только организаторам турниров
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
            <input
              type="radio"
              name="audience"
              value="personal"
              checked={audience === "personal"}
              onChange={() => setAudience("personal")}
              className="accent-brand-lime"
            />
            Персонально (выбор из списка)
          </label>
        </fieldset>

        {audience === "personal" ? (
          <div className="space-y-2 rounded-lg border border-brand-neutral/80 bg-brand-bg/40 p-3">
            <Label htmlFor="user-filter">Поиск</Label>
            <Input
              id="user-filter"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Имя или email…"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-brand-muted">Никого не найдено.</p>
              ) : (
                filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-brand-surface/80"
                  >
                    <input
                      type="checkbox"
                      name="userIds"
                      value={user.id}
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="mt-0.5 accent-brand-lime"
                    />
                    <span className="min-w-0">
                      <span className="block text-white">{user.name}</span>
                      <span className="block truncate text-xs text-brand-muted">
                        {user.email}
                        {user.telegramLinked ? " · Telegram ✓" : ""}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
            {selectedIds.size > 0 ? (
              <p className="text-xs text-brand-muted">
                Выбрано: {selectedIds.size}
              </p>
            ) : null}
          </div>
        ) : null}

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-white">Куда</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              name="channelInApp"
              defaultChecked
              className="accent-brand-lime"
            />
            Уведомления на сайте
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${
              telegramConfigured
                ? "cursor-pointer text-white"
                : "cursor-not-allowed text-brand-muted"
            }`}
          >
            <input
              type="checkbox"
              name="channelTelegram"
              defaultChecked={telegramConfigured}
              disabled={!telegramConfigured}
              className="accent-brand-lime disabled:opacity-50"
            />
            Telegram (личные сообщения бота)
            {!telegramConfigured ? (
              <span className="text-xs"> — бот не настроен</span>
            ) : null}
          </label>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="broadcast-title">Заголовок</Label>
          <Input
            id="broadcast-title"
            name="title"
            required
            maxLength={120}
            placeholder="Например: Обновление правил"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-body">Текст</Label>
          <textarea
            id="broadcast-body"
            name="body"
            required
            maxLength={2000}
            rows={6}
            placeholder="Текст уведомления…"
            className="flex min-h-32 w-full resize-y rounded-xl border border-brand-neutral bg-brand-bg px-4 py-3 text-base text-white placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Отправляем…" : "Отправить"}
        </Button>
      </form>
    </div>
  );
}
