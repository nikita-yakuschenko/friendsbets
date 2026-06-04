"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
        Telegram-бот не настроен на сервере.
      </p>
    );
  }

  if (!telegramLinked) {
    return (
      <p className="text-xs text-brand-muted">
        {userName} не привязал Telegram (Профиль → Привязать Telegram).
      </p>
    );
  }

  function handleSubmit() {
    const text = message.trim();
    if (!text) {
      toast.error("Введите текст сообщения.");
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

  const linkedLabel = telegramUsername ? `@${telegramUsername}` : "привязан";

  if (compact) {
    return (
      <div className="w-full space-y-2 border-t border-brand-neutral/50 pt-3">
        <p className="text-xs font-medium text-brand-muted">
          Telegram ({linkedLabel})
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={4000}
          disabled={pending}
          placeholder="Сообщение в бот…"
          className="w-full resize-y rounded-lg border border-brand-neutral bg-brand-bg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={pending || !message.trim()}
          onClick={handleSubmit}
        >
          {pending ? "Отправляем…" : "Отправить в Telegram"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-white">Сообщение в Telegram</h2>
        <p className="mt-1 text-xs text-brand-muted">
          Личное сообщение через бота. Получатель: {userName}
          {telegramUsername ? (
            <>
              {" "}
              <span className="text-brand-lime">@{telegramUsername}</span>
            </>
          ) : null}
          . Копия появится в уведомлениях на сайте.
        </p>
      </div>
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
        disabled={pending || !message.trim()}
        onClick={handleSubmit}
      >
        {pending ? "Отправляем…" : "Отправить в Telegram"}
      </Button>
    </div>
  );
}
