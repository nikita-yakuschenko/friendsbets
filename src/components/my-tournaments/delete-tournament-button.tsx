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
import { PickActiveTournamentDialog } from "@/components/my-tournaments/pick-active-tournament-dialog";
import type { TournamentPickOption } from "@/components/my-tournaments/types";
import { useEndTournamentMembership } from "@/components/my-tournaments/use-end-tournament-membership";
import { deleteSoloTournamentAction } from "@/server/actions/delete-solo-tournament";

export function DeleteTournamentButton({
  gameId,
  gameTitle,
  inviteCode,
  isActive,
  otherTournaments,
}: {
  gameId: string;
  gameTitle: string;
  inviteCode: string;
  isActive: boolean;
  otherTournaments: TournamentPickOption[];
}) {
  const {
    confirmOpen,
    setConfirmOpen,
    pickOpen,
    setPickOpen,
    selectedInviteCode,
    setSelectedInviteCode,
    pending,
    needsPick,
    handleConfirm,
    handlePickConfirm,
  } = useEndTournamentMembership({
    isActive,
    otherTournaments,
    execute: (nextActiveInviteCode) =>
      deleteSoloTournamentAction(gameId, nextActiveInviteCode),
    successMessage: "Турнир удалён",
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-sm font-medium text-brand-red transition-colors hover:text-brand-red/80"
      >
        Удалить
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить турнир?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Турнир «{gameTitle}» будет удалён без возможности восстановления.
              </span>
              <span className="block">
                Код приглашения:{" "}
                <span className="font-mono text-white">{inviteCode}</span>
              </span>
              {isActive && otherTournaments.length === 1 ? (
                <span className="block">
                  Текущим станет турнир «{otherTournaments[0]!.title}».
                </span>
              ) : null}
              {needsPick ? (
                <span className="block">
                  Затем нужно будет выбрать, какой турнир сделать текущим.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={handleConfirm}
            >
              {pending ? "Удаляем…" : "Удалить турнир"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PickActiveTournamentDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        options={otherTournaments}
        selectedInviteCode={selectedInviteCode}
        onSelect={setSelectedInviteCode}
        pending={pending}
        onConfirm={handlePickConfirm}
        description="Текущий турнир будет удалён. Выберите, какой из оставшихся турниров сделать текущим."
      />
    </>
  );
}
