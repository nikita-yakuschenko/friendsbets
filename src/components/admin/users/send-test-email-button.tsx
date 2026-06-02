"use client";

import { useState } from "react";
import { IconMail } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendTestEmailToUserAction } from "@/server/actions/admin";

export function SendTestEmailButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const result = await sendTestEmailToUserAction(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? `Письмо отправлено на ${email}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 border-brand-border text-xs"
      disabled={pending}
      onClick={handleClick}
      title={`Отправить тестовое письмо на ${email}`}
    >
      <IconMail className="size-3.5" />
      {pending ? "…" : "Тест"}
    </Button>
  );
}
