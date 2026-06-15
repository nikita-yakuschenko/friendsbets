"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateNotificationPreferencesAction } from "@/server/actions/profile";

export type NotificationPreferencesState = {
  notifyByEmail: boolean;
  notifyByTelegram: boolean;
  notifyInApp: boolean;
  emailVerified: boolean;
  telegramLinked: boolean;
  telegramConfigured: boolean;
};

function parseCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

const checkboxClass =
  "size-4 shrink-0 rounded border border-brand-neutral bg-brand-bg text-brand-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/60 disabled:cursor-not-allowed disabled:opacity-50";

export function NotificationPreferencesSection({
  preferences,
}: {
  preferences: NotificationPreferencesState;
}) {
  const router = useRouter();
  const [notifyByEmail, setNotifyByEmail] = useState(preferences.notifyByEmail);
  const [notifyByTelegram, setNotifyByTelegram] = useState(
    preferences.notifyByTelegram,
  );
  const [notifyInApp, setNotifyInApp] = useState(preferences.notifyInApp);

  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    undefined,
  );

  const hasChanges = useMemo(
    () =>
      notifyByEmail !== preferences.notifyByEmail ||
      notifyByTelegram !== preferences.notifyByTelegram ||
      notifyInApp !== preferences.notifyInApp,
    [
      notifyByEmail,
      notifyByTelegram,
      notifyInApp,
      preferences.notifyByEmail,
      preferences.notifyByTelegram,
      preferences.notifyInApp,
    ],
  );

  const prevStateRef = useRef<typeof state>(undefined);
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
    const id = window.setTimeout(() => {
      if (state?.success) {
        toast.success("Настройки уведомлений сохранены");
        router.refresh();
      } else if (state?.error) {
        toast.error(state.error);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [state, router]);

  useEffect(() => {
    setNotifyByEmail(preferences.notifyByEmail);
    setNotifyByTelegram(preferences.notifyByTelegram);
    setNotifyInApp(preferences.notifyInApp);
  }, [
    preferences.notifyByEmail,
    preferences.notifyByTelegram,
    preferences.notifyInApp,
  ]);

  const emailDisabled = !preferences.emailVerified;
  const telegramDisabled =
    !preferences.telegramConfigured || !preferences.telegramLinked;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || pending) return;

    const formData = new FormData(event.currentTarget);
    formData.set("notifyByEmail", parseCheckbox(formData.get("notifyByEmail")) ? "1" : "0");
    formData.set(
      "notifyByTelegram",
      parseCheckbox(formData.get("notifyByTelegram")) ? "1" : "0",
    );
    formData.set("notifyInApp", parseCheckbox(formData.get("notifyInApp")) ? "1" : "0");

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <section className="rounded-xl border border-brand-neutral bg-brand-surface/50 p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Уведомления</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Выберите, куда присылать напоминания о матчах, результаты и другие
          события турниров.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border border-brand-neutral/60 bg-brand-surface/30 px-3 py-3",
            emailDisabled && "cursor-not-allowed opacity-70",
          )}
        >
          <input
            type="checkbox"
            name="notifyByEmail"
            className={checkboxClass}
            checked={notifyByEmail}
            disabled={emailDisabled || pending}
            onChange={(event) => setNotifyByEmail(event.target.checked)}
          />
          <span className="min-w-0 space-y-1">
            <span className="block text-sm font-medium text-white">По email</span>
            <span className="block text-xs text-brand-muted">
              {preferences.emailVerified
                ? "Письма на подтверждённый адрес из профиля."
                : "Подтвердите email — тогда можно включить этот канал."}
            </span>
          </span>
        </label>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border border-brand-neutral/60 bg-brand-surface/30 px-3 py-3",
            telegramDisabled && "cursor-not-allowed opacity-70",
          )}
        >
          <input
            type="checkbox"
            name="notifyByTelegram"
            className={checkboxClass}
            checked={notifyByTelegram}
            disabled={telegramDisabled || pending}
            onChange={(event) => setNotifyByTelegram(event.target.checked)}
          />
          <span className="min-w-0 space-y-1">
            <span className="block text-sm font-medium text-white">
              В Telegram
            </span>
            <span className="block text-xs text-brand-muted">
              {!preferences.telegramConfigured
                ? "Бот на сервере не настроен."
                : preferences.telegramLinked
                  ? "Личные сообщения от бота FriendsBets."
                  : "Сначала привяжите Telegram в блоке ниже."}
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-neutral/60 bg-brand-surface/30 px-3 py-3">
          <input
            type="checkbox"
            name="notifyInApp"
            className={checkboxClass}
            checked={notifyInApp}
            disabled={pending}
            onChange={(event) => setNotifyInApp(event.target.checked)}
          />
          <span className="min-w-0 space-y-1">
            <span className="block text-sm font-medium text-white">
              В приложении (на сайте)
            </span>
            <span className="block text-xs text-brand-muted">
              Колокольчик и раздел «Уведомления» на сайте.
            </span>
          </span>
        </label>

        <div className="border-t border-brand-neutral/60 pt-4">
          <Button type="submit" disabled={!hasChanges || pending}>
            {pending ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </section>
  );
}
