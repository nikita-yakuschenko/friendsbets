"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setActiveGameAction } from "@/server/actions/active-game";
import { Button } from "@/components/ui/button";

export function SetActiveTournamentButton({
  inviteCode,
  gameTitle,
  className,
}: {
  inviteCode: string;
  gameTitle: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className={
        className ??
        "h-auto min-h-0 px-0 py-0 text-sm font-medium text-brand-cyan hover:text-brand-lime"
      }
      onClick={() => {
        startTransition(async () => {
          const result = await setActiveGameAction(inviteCode);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`«${gameTitle}» — текущий турнир`);
        });
      }}
    >
      {pending ? "…" : "Сделать текущим"}
    </Button>
  );
}
