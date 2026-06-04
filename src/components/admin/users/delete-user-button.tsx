"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteUserAction } from "@/server/actions/admin";

const iconBtnClass =
  "size-8 min-h-8 min-w-8 shrink-0 p-0 text-brand-muted hover:text-white";

export function DeleteUserButton({
  userId,
  userName,
  redirectTo,
}: {
  userId: string;
  userName: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteUserAction(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Пользователь удалён");
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconBtnClass}
        title={`Удалить ${userName}`}
        onClick={() => setOpen(true)}
      >
        <IconTrash className="size-4" stroke={1.75} aria-hidden />
        <span className="sr-only">Удалить</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Аккаунт <strong className="text-white">{userName}</strong> и все
              прогнозы будут удалены без восстановления.
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
              onClick={confirmDelete}
            >
              {pending ? "Удаляем…" : "Удалить"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
