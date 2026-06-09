"use client";

import { IconPencil } from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateGameTitleBySuperadminAction } from "@/server/actions/admin";

const TITLE_MAX_LENGTH = 120;

export function RenameGameTitleButton({
  gameId,
  gameTitle,
  className,
  variant = "icon",
}: {
  gameId: string;
  gameTitle: string;
  className?: string;
  variant?: "icon" | "inline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(gameTitle);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setTitle(gameTitle);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateGameTitleBySuperadminAction(gameId, title);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Название обновлено");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        nativeButton
        render={
          variant === "inline" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={className}
            >
              <IconPencil className="size-4" aria-hidden />
              Переименовать
            </Button>
          ) : (
            <button
              type="button"
              title="Переименовать турнир"
              aria-label={`Переименовать турнир «${gameTitle}»`}
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-md p-0 text-brand-muted transition-colors",
                "hover:bg-transparent hover:text-brand-lime",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/60",
                className,
              )}
            >
              <IconPencil className="size-[18px] stroke-[1.75]" aria-hidden />
            </button>
          )
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Название турнира</AlertDialogTitle>
          <AlertDialogDescription>
            Отображается участникам в списке игр и в шапке турнира. Invite-код не
            меняется.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor={`rename-game-${gameId}`}>Название</Label>
          <Input
            id={`rename-game-${gameId}`}
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
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
            size="sm"
            disabled={pending || !title.trim()}
            onClick={handleSave}
          >
            {pending ? "Сохраняем…" : "Сохранить"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
