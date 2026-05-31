"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyInviteLink({
  url,
  label = "Скопировать ссылку",
}: {
  url: string;
  label?: string;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div className="flex gap-2">
      <Input readOnly value={url} className="text-sm" />
      <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
        {label}
      </Button>
    </div>
  );
}
