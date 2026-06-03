"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TournamentPickOption } from "@/components/my-tournaments/types";

export function PickActiveTournamentDialog({
  open,
  onOpenChange,
  options,
  selectedInviteCode,
  onSelect,
  pending,
  onConfirm,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: TournamentPickOption[];
  selectedInviteCode: string | null;
  onSelect: (inviteCode: string) => void;
  pending: boolean;
  onConfirm: () => void;
  description: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Выберите текущий турнир</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-56 space-y-2 overflow-y-auto py-1">
          {options.map((option) => {
            const selected = selectedInviteCode === option.inviteCode;
            return (
              <li key={option.inviteCode}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onSelect(option.inviteCode)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    selected
                      ? "border-brand-lime bg-brand-lime/10 text-white"
                      : "border-brand-neutral bg-brand-bg text-white/90 hover:border-brand-lime/50",
                  )}
                >
                  <span className="block font-medium">{option.title}</span>
                  <span className="mt-0.5 block font-mono text-xs text-brand-muted">
                    {option.inviteCode}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || !selectedInviteCode}
            onClick={onConfirm}
          >
            {pending ? "Сохраняем…" : "Сделать текущим"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
