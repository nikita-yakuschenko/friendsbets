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
      variant="ghost"
      size="icon"
      className="size-8 min-h-8 min-w-8 shrink-0 p-0 text-brand-muted hover:text-white"
      disabled={pending}
      onClick={handleClick}
      title={`Тестовое письмо на ${email}`}
    >
      <IconMail className="size-4" stroke={1.75} aria-hidden />
      <span className="sr-only">Тест почты</span>
    </Button>
  );
}
