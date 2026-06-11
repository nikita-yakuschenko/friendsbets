"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import type { TelegramLinkStatus } from "@/server/actions/telegram";
import {
  createTelegramLinkAction,
  unlinkTelegramAction,
} from "@/server/actions/telegram";
import { openTelegramDeepLink } from "@/lib/telegram/open-deep-link";
import { cn } from "@/lib/utils";

const TELEGRAM_INFO =
  "Уведомления о заявках, рассылки и сообщения с сайта приходят в бот после привязки.";

const actionLinkClass =
  "shrink-0 text-sm font-medium text-brand-lime underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/60 disabled:cursor-not-allowed disabled:opacity-50";

function telegramStatusBadgeText(status: TelegramLinkStatus): string {
  if (!status.linked) return "Не привязан";
  if (status.username) return `@${status.username.replace(/^@/, "")}`;
  return "Привязан";
}

export function TelegramLinkSection({
  status,
  className,
}: {
  status: TelegramLinkStatus;
  className?: string;
}) {
  const router = useRouter();
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shellClass = cn(
    "rounded-xl border border-brand-neutral/60 bg-brand-surface/30 px-4 py-3 md:px-5",
    className,
  );

  const linked = status.linked;
  const badgeText = telegramStatusBadgeText(status);

  useEffect(() => {
    if (linked) setPendingDeepLink(null);
  }, [linked]);

  function handleLink() {
    startTransition(async () => {
      const result = await createTelegramLinkAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.deepLink) {
        toast.error("Не удалось получить ссылку для привязки.");
        return;
      }

      setPendingDeepLink(result.deepLink);
      openTelegramDeepLink(result.deepLink);
      toast.success("Открываем Telegram…", {
        description: "В боте нажмите «Start» или «Запустить».",
      });
      router.refresh();
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkTelegramAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPendingDeepLink(null);
      toast.success(result.message ?? "Telegram отвязан");
    });
  }

  if (!status.configured) {
    return (
      <section className={shellClass}>
        <div className="flex min-h-9 flex-nowrap items-center gap-2 sm:gap-3">
          <span className="shrink-0 text-sm font-medium text-white">Telegram</span>
          <Badge variant="secondary" className="shrink-0">
            Недоступен
          </Badge>
        </div>
      </section>
    );
  }

  return (
    <section className={shellClass}>
      <div className="flex min-h-9 flex-nowrap items-center gap-2 sm:gap-3">
        <InfoHint title="Уведомления в Telegram" className="shrink-0">
          {TELEGRAM_INFO}
        </InfoHint>
        <span className="shrink-0 text-sm font-medium text-white">Telegram</span>
        <Badge
          variant={linked ? "default" : "destructive"}
          className="max-w-[11rem] shrink-0 truncate"
          title={badgeText}
        >
          {badgeText}
        </Badge>
        <span className="min-w-0 flex-1" aria-hidden />
        <button
          type="button"
          className={actionLinkClass}
          disabled={pending}
          onClick={linked ? handleUnlink : handleLink}
        >
          {pending ? "…" : linked ? "Отвязать" : "Привязать"}
        </button>
      </div>

      {pendingDeepLink && !linked ? (
        <div className="mt-3 space-y-3 border-t border-brand-neutral/50 pt-3">
          <p className="text-sm text-brand-muted">
            Нажмите кнопку ниже — откроется бот FriendsBets. В Telegram нажмите
            «Start» или «Запустить», затем вернитесь на сайт и обновите страницу.
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => openTelegramDeepLink(pendingDeepLink)}
          >
            Открыть Telegram
          </Button>
          <a
            href={pendingDeepLink}
            className="block break-all text-xs text-brand-lime underline-offset-2 hover:underline"
            onClick={(event) => {
              event.preventDefault();
              openTelegramDeepLink(pendingDeepLink);
            }}
          >
            {pendingDeepLink}
          </a>
        </div>
      ) : null}
    </section>
  );
}
