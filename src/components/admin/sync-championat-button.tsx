"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncChampionatMatchesAction } from "@/server/actions/admin";

export function SyncChampionatButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await syncChampionatMatchesAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Синхронизация: ${result.total ?? 0} матчей · новых ${result.created ?? 0} · обновлено ${result.updated ?? 0}${result.venuesUpdated ? ` · стадионов ${result.venuesUpdated}` : ""}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" disabled={loading} onClick={handleClick}>
      {loading ? "Синхронизация…" : "Синхронизировать с Championat"}
    </Button>
  );
}
