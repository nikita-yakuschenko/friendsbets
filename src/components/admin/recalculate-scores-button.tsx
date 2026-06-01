"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recalculateAllScoresAction } from "@/server/actions/admin";

export function RecalculateScoresButton({ gameId }: { gameId: string }) {
  async function handleClick() {
    const result = await recalculateAllScoresAction(gameId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Очки пересчитаны");
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleClick}>
      Пересчитать очки
    </Button>
  );
}
