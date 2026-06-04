"use client";

import { IconBrandTelegram } from "@tabler/icons-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { broadcastPlatformNotificationAction } from "@/server/actions/broadcast-notification";
import type { AdminBroadcastUserOption } from "@/server/actions/admin";
import type { ActionResult } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

type Audience = "all" | "organizers" | "personal";

const broadcastSidebarClass =
  "space-y-5 overflow-visible border-brand-neutral/80 bg-brand-bg/25 p-4 md:border-t lg:border-t-0 lg:border-l lg:bg-brand-bg/40 lg:p-5";

/** Высота одной строки в выпадающем списке (~36px × 5). */
const RECIPIENT_ROW_HEIGHT_REM = 2.25;
const RECIPIENT_LIST_MAX_ROWS = 5;

function PersonalRecipientSearch({
  users,
  selectedIds,
  onToggle,
}: {
  users: AdminBroadcastUserOption[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const showDropdown = open && query.trim().length > 0;

  useEffect(() => {
    if (!showDropdown) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showDropdown]);

  return (
    <div ref={rootRef} className="relative space-y-2">
      <Label htmlFor="user-filter" className="text-xs">
        Поиск
      </Label>
      <Input
        id="user-filter"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Имя или email…"
        className="h-9 text-sm"
        autoComplete="off"
        aria-expanded={showDropdown}
        aria-controls="broadcast-user-results"
        role="combobox"
      />

      {[...selectedIds].map((id) => (
        <input key={id} type="hidden" name="userIds" value={id} />
      ))}

      {showDropdown ? (
        <div
          id="broadcast-user-results"
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border border-brand-neutral bg-brand-surface shadow-lg ring-1 ring-black/20"
        >
          {filteredUsers.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-brand-muted">
              Никого не найдено
            </p>
          ) : (
            <ul
              className="scrollbar-brand-thin overflow-y-auto overscroll-contain py-0.5"
              style={{
                maxHeight: `calc(${RECIPIENT_LIST_MAX_ROWS} * ${RECIPIENT_ROW_HEIGHT_REM} * 1rem)`,
              }}
            >
              {filteredUsers.map((user) => {
                const checked = selectedIds.has(user.id);
                return (
                  <li key={user.id} role="option" aria-selected={checked}>
                    <label className="flex cursor-pointer items-start gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-brand-neutral/35">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(user.id)}
                        className="mt-1 shrink-0 accent-brand-lime"
                      />
                      <span className="flex min-w-0 flex-1 items-start gap-1">
                        {user.telegramLinked ? (
                          <IconBrandTelegram
                            className="mt-0.5 size-3.5 shrink-0 text-[#2AABEE]"
                            aria-label="Telegram привязан"
                          />
                        ) : (
                          <span
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-white">
                            {user.name}
                          </span>
                          <span className="block truncate text-[10px] text-brand-muted">
                            {user.email}
                          </span>
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {filteredUsers.length > RECIPIENT_LIST_MAX_ROWS ? (
            <p className="border-t border-brand-neutral/60 px-2 py-1 text-center text-[10px] text-brand-muted">
              {filteredUsers.length} найдено — прокрутите список
            </p>
          ) : null}
        </div>
      ) : null}

      {selectedIds.size > 0 ? (
        <p className="text-xs text-brand-muted">Выбрано: {selectedIds.size}</p>
      ) : (
        <p className="text-[11px] leading-snug text-brand-muted/80">
          Введите имя или email
        </p>
      )}
    </div>
  );
}

function BroadcastSidebarSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-sm font-medium text-white">{title}</legend>
      {children}
    </fieldset>
  );
}

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

  const formRef = useRef<HTMLFormElement>(null);
  const [audience, setAudience] = useState<Audience>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function handleSubmitShortcut(event: KeyboardEvent) {
    if (pending) return;
    if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 md:mx-0 md:max-w-none">
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-white">Рассылка уведомлений</h2>
        <p className="max-w-3xl text-sm text-brand-muted">
          Слева — текст рассылки, справа — получатели и каналы. Email только на
          подтверждённый адрес. Без привязки Telegram при одном боте — fallback
          на сайт.
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
        ref={formRef}
        action={formAction}
        className="rounded-xl border border-brand-neutral bg-brand-surface/50 lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_20rem]"
        onKeyDown={handleSubmitShortcut}
      >
        <div className="flex min-w-0 flex-col gap-5 p-4 md:p-5 lg:pr-6">
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
          <div className="flex min-h-0 flex-1 flex-col space-y-2">
            <Label htmlFor="broadcast-body">Текст</Label>
            <textarea
              id="broadcast-body"
              name="body"
              required
              maxLength={2000}
              rows={10}
              placeholder="Текст уведомления…"
              className="flex min-h-48 w-full flex-1 resize-y rounded-xl border border-brand-neutral bg-brand-bg px-4 py-3 text-base text-white placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-56"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={pending}
              className="h-9 min-w-[7.5rem] shrink-0 px-5"
            >
              {pending ? "…" : "Отправить"}
            </Button>
            <span className="text-xs text-brand-muted">
              Ctrl+Enter — отправить
            </span>
          </div>
        </div>

        <aside className={broadcastSidebarClass} aria-label="Параметры рассылки">
          <BroadcastSidebarSection title="Кому">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
              <input
                type="radio"
                name="audience"
                value="all"
                checked={audience === "all"}
                onChange={() => setAudience("all")}
                className="accent-brand-lime"
              />
              Всем
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
              Организаторам
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-white">
              <input
                type="radio"
                name="audience"
                value="personal"
                checked={audience === "personal"}
                onChange={() => setAudience("personal")}
                className="mt-0.5 accent-brand-lime"
              />
              <span>Персонально</span>
            </label>
          </BroadcastSidebarSection>

          {audience === "personal" ? (
            <PersonalRecipientSearch
              users={users}
              selectedIds={selectedIds}
              onToggle={toggleUser}
            />
          ) : null}

          <BroadcastSidebarSection title="Куда">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-white">
              <input
                type="checkbox"
                name="channelInApp"
                defaultChecked
                className="mt-0.5 accent-brand-lime"
              />
              <span>На сайте</span>
            </label>
            <label
              className={cn(
                "flex items-start gap-2 text-sm",
                telegramConfigured
                  ? "cursor-pointer text-white"
                  : "cursor-not-allowed text-brand-muted",
              )}
            >
              <input
                type="checkbox"
                name="channelTelegram"
                defaultChecked={telegramConfigured}
                disabled={!telegramConfigured}
                className="mt-0.5 accent-brand-lime disabled:opacity-50"
              />
              <span>
                Telegram
                {!telegramConfigured ? (
                  <span className="block text-[11px]">бот не настроен</span>
                ) : null}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-white">
              <input
                type="checkbox"
                name="channelEmail"
                className="mt-0.5 accent-brand-lime"
              />
              <span>
                Email
                <span className="block text-[11px] text-brand-muted">
                  подтверждённый
                </span>
              </span>
            </label>
          </BroadcastSidebarSection>
        </aside>
      </form>
    </div>
  );
}
