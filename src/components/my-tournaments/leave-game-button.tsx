"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { leaveGameAction } from "@/server/actions/leave-game";

export function LeaveGameButton({
  gameId,
  gameTitle,
}: {
  gameId: string;
  gameTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleLeave() {
    startTransition(async () => {
      const result = await leaveGameAction(gameId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Вы вышли из турнира");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        nativeButton
        render={
          <button
            type="button"
            className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-red"
          >
            Покинуть
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Покинуть турнир?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы выйдете из турнира «{gameTitle}». Ваши прогнозы в этом турнире
            будут удалены.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={handleLeave}
          >
            {pending ? "Выходим…" : "Покинуть турнир"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
