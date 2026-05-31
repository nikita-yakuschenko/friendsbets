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
    <Button type="button" variant="secondary" className="w-full" onClick={handleCopy}>
      Скопировать текст напоминания
    </Button>
  );
}
