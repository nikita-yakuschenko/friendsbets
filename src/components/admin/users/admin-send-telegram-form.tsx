"use client";

import { useState, useTransition } from "react";
import { IconBrandTelegram } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Label } from "@/components/ui/label";
import { sendAdminTelegramMessageAction } from "@/server/actions/telegram";

export function AdminSendTelegramForm({
  userId,
  userName,
  telegramLinked,
  telegramUsername,
  telegramConfigured,
  compact = false,
}: {
  userId: string;
  userName: string;
  telegramLinked: boolean;
  telegramUsername: string | null;
  telegramConfigured: boolean;
  compact?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  if (!telegramConfigured) {
    return (
      <p className="text-xs text-brand-muted">
        Telegram-бот не настроен (TELEGRAM_BOT_TOKEN).
      </p>
    );
  }

  const linkedLabel = telegramUsername ? `@${telegramUsername}` : "привязан";
  const canSend = telegramLinked;

  function handleSubmit() {
    const text = message.trim();
    if (!text) {
      toast.error("Введите текст сообщения.");
      return;
    }
    if (!canSend) {
      toast.error(
        `${userName} не привязал Telegram. Попросите: Профиль → Привязать Telegram.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await sendAdminTelegramMessageAction(userId, text);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setMessage("");
      toast.success(result.message ?? "Отправлено");
    });
  }

  if (compact) {
    return (
      <div className="w-full space-y-2 border-t border-brand-neutral/50 pt-3">
        <div className="flex items-center gap-2">
          <IconBrandTelegram
            className="size-4 shrink-0 text-brand-cyan"
            stroke={1.75}
            aria-hidden
          />
          <p className="text-xs font-medium text-brand-muted">
            Telegram
            {telegramLinked ? ` (${linkedLabel})` : " — не привязан"}
          </p>
        </div>
        {!telegramLinked ? (
          <p className="text-xs text-brand-muted">
            Личное сообщение недоступно, пока пользователь не привяжет бота в
            профиле.
          </p>
        ) : null}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={4000}
          disabled={pending}
          placeholder={
            canSend
              ? "Личное сообщение в бот…"
              : "Сначала пользователь привяжет Telegram"
          }
          className="w-full resize-y rounded-lg border border-brand-neutral bg-brand-bg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:opacity-60"
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={pending || !message.trim() || !canSend}
          onClick={handleSubmit}
        >
          {pending ? "Отправляем…" : "Отправить в Telegram"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconBrandTelegram
            className="size-5 shrink-0 text-brand-cyan"
            stroke={1.75}
            aria-hidden
          />
          <h2 className="text-sm font-medium text-white">Сообщение в Telegram</h2>
          <InfoHint title="Личное сообщение в бот">
            Сообщение уйдёт только пользователю {userName} в Telegram, без
            дубликата в уведомлениях на сайте.
          </InfoHint>
        </div>
        <span
          className={
            telegramLinked ? "text-sm text-brand-lime" : "text-sm text-brand-muted"
          }
        >
          {telegramLinked ? linkedLabel : "Не привязан"}
        </span>
      </div>

      {!telegramLinked ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
          Пользователь не привязал Telegram в профиле — отправка недоступна.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`tg-msg-${userId}`}>Текст</Label>
        <textarea
          id={`tg-msg-${userId}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={4000}
          disabled={pending}
          placeholder="Текст для пользователя…"
          className="w-full resize-y rounded-xl border border-brand-neutral bg-brand-bg px-4 py-3 text-sm text-white placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        />
      </div>
      <Button
        type="button"
        disabled={pending || !message.trim() || !canSend}
        onClick={handleSubmit}
      >
        {pending ? "Отправляем…" : "Отправить в Telegram"}
      </Button>
    </div>
  );
}
