"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { TournamentActionButton } from "@/components/my-tournaments/tournament-action-link";
import { setActiveGameAction } from "@/server/actions/active-game";

export function SetActiveTournamentButton({
  inviteCode,
  gameTitle,
}: {
  inviteCode: string;
  gameTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <TournamentActionButton
      variant="secondary"
      disabled={pending}
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
    </TournamentActionButton>
  );
}
