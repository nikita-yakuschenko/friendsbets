"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TelegramLinkStatus } from "@/server/actions/telegram";
import {
  createTelegramLinkAction,
  unlinkTelegramAction,
} from "@/server/actions/telegram";

export function TelegramLinkSection({ status }: { status: TelegramLinkStatus }) {
  const [pending, startTransition] = useTransition();
  const [deepLink, setDeepLink] = useState<string | null>(null);

  if (!status.configured) {
    return (
      <section className="mt-6 space-y-2 rounded-xl border border-brand-neutral/60 bg-brand-surface/30 p-4 text-left">
        <h2 className="text-sm font-medium text-white">Telegram</h2>
        <p className="text-sm text-brand-muted">
          Уведомления в Telegram пока не настроены на сервере.
        </p>
      </section>
    );
  }

  function handleLink() {
    startTransition(async () => {
      const result = await createTelegramLinkAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.deepLink) {
        setDeepLink(result.deepLink);
        window.open(result.deepLink, "_blank", "noopener,noreferrer");
        toast.success(result.message ?? "Откройте Telegram и нажмите Start");
      }
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkTelegramAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDeepLink(null);
      toast.success(result.message ?? "Telegram отвязан");
    });
  }

  return (
    <section className="mt-6 space-y-3 rounded-xl border border-brand-neutral/60 bg-brand-surface/30 p-4 text-left">
      <div>
        <h2 className="text-sm font-medium text-white">Telegram</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Персональные уведомления: заявки, рассылки платформы и сообщения в
          приложении дублируются в бот.
        </p>
      </div>

      {status.linked ? (
        <div className="space-y-3">
          <p className="text-sm text-white">
            Привязан
            {status.username ? (
              <>
                {" "}
                <span className="text-brand-lime">@{status.username}</span>
              </>
            ) : null}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={handleUnlink}
          >
            {pending ? "…" : "Отвязать Telegram"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleLink}
          >
            {pending ? "Готовим ссылку…" : "Привязать Telegram"}
          </Button>
          {deepLink ? (
            <p className="text-xs text-brand-muted">
              Ссылка действует 15 минут. Если Telegram не открылся —{" "}
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-cyan hover:underline"
              >
                откройте вручную
              </a>
              .
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
