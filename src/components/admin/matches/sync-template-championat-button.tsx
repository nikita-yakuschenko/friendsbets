"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncTemplateChampionatAction } from "@/server/actions/admin";

export function SyncTemplateChampionatButton({
  templateId,
  templateTitle,
}: {
  templateId: string;
  templateTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await syncTemplateChampionatAction(templateId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `«${templateTitle}»: ${result.total ?? 0} матчей · обновлено ${result.updated ?? 0}${result.venuesUpdated ? ` · стадионов ${result.venuesUpdated}` : ""}`,
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? "Загрузка…" : "Обновить с Championat"}
    </Button>
  );
}
