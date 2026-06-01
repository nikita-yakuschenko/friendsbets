"use client";

import { IconTrash } from "@tabler/icons-react";
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
import { cn } from "@/lib/utils";
import { deleteGameAction } from "@/server/actions/admin";

export function DeleteGameButton({
  gameId,
  gameTitle,
  inviteCode,
  className,
}: {
  gameId: string;
  gameTitle: string;
  inviteCode: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGameAction(gameId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Турнир удалён");
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
            title="Удалить турнир"
            aria-label={`Удалить турнир «${gameTitle}»`}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md p-0 text-brand-muted transition-colors",
              "hover:bg-transparent hover:text-brand-red",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/60",
              className,
            )}
          >
            <IconTrash className="size-[18px] stroke-[1.75]" aria-hidden />
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить турнир?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Турнир «<span className="text-white">{gameTitle}</span>» будет
              удалён без возможности восстановления.
            </span>
            <span className="block">
              Код приглашения:{" "}
              <span className="font-mono text-white">{inviteCode}</span>
            </span>
            <span className="block">
              Будут удалены все участники и прогнозы.
            </span>
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
            onClick={handleDelete}
          >
            {pending ? "Удаляем…" : "Удалить"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
