"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { sendMissingPredictionReminderAction } from "@/server/actions/send-missing-prediction-reminder";
import type { MissingReminderChannel } from "@/lib/missing-prediction-reminder";

const CHANNELS: { id: MissingReminderChannel; label: string }[] = [
  { id: "everywhere", label: "Везде" },
  { id: "telegram", label: "Telegram" },
  { id: "email", label: "Почта" },
  { id: "inApp", label: "Уведомления" },
];

export function SendMissingReminderButton({
  routeParam,
  inviteCode,
  matchId,
  disabled,
}: {
  routeParam: string;
  inviteCode: string;
  matchId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<MissingReminderChannel>("everywhere");
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await sendMissingPredictionReminderAction(
        routeParam,
        matchId,
        inviteCode,
        channel,
      );
      if (result.error) {
        toast.error(result.error, {
          description: result.detail,
          duration: 6000,
        });
        return;
      }
      toast.success(result.message ?? "Напоминание отправлено", {
        description: result.detail,
        duration: result.detail ? 5500 : 3200,
      });
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        className="h-9 shrink-0 px-4"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Отправить уведомление
      </Button>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-2.5 rounded-lg border border-brand-lime/30 bg-brand-bg/60 p-3">
      <Label className="text-xs text-brand-muted">Куда отправить</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CHANNELS.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-brand-neutral/80 px-2 py-1.5 text-xs text-white has-checked:border-brand-lime has-checked:bg-brand-lime/10"
          >
            <input
              type="radio"
              name={`channel-${matchId}`}
              value={item.id}
              checked={channel === item.id}
              onChange={() => setChannel(item.id)}
              className="accent-brand-lime"
            />
            {item.label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleSend}
        >
          {pending ? "Отправляем…" : "Отправить"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}
