"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recalculateAllScoresAction } from "@/server/actions/admin";

export function RecalculateScoresButton({
  tournamentId,
}: {
  /** Если указан — только игры на календаре этого шаблона. */
  tournamentId?: string;
}) {
  async function handleClick() {
    const result = await recalculateAllScoresAction(
      tournamentId ? { tournamentId } : undefined,
    );
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Очки пересчитаны во всех турнирах на шаблоне");
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleClick}>
      Пересчитать очки
    </Button>
  );
}
