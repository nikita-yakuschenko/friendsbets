"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyReminderButton({ text }: { text: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Текст скопирован");
    } catch {
      toast.error("Не удалось скопировать текст");
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="h-9 shrink-0 px-3"
      onClick={handleCopy}
    >
      Скопировать текст
    </Button>
  );
}
