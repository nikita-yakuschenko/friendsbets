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
import { leaveGameAction } from "@/server/actions/leave-game";
import { TournamentActionButton } from "@/components/my-tournaments/tournament-action-link";

export function LeaveGameButton({
  gameId,
  gameTitle,
  isActive,
  otherTournaments,
}: {
  gameId: string;
  gameTitle: string;
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
      leaveGameAction(gameId, nextActiveInviteCode),
    successMessage: "Вы вышли из турнира",
  });

  return (
    <>
      <TournamentActionButton variant="danger" onClick={() => setConfirmOpen(true)}>
        Покинуть
      </TournamentActionButton>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Покинуть турнир?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы выйдете из турнира «{gameTitle}». Ваши прогнозы в этом турнире
              будут удалены.
              {isActive && otherTournaments.length === 1 ? (
                <span className="mt-2 block">
                  Текущим станет турнир «{otherTournaments[0]!.title}».
                </span>
              ) : null}
              {needsPick ? (
                <span className="mt-2 block">
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
              {pending ? "Выходим…" : "Покинуть турнир"}
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
        description="Текущий турнир будет закрыт. Выберите, какой из оставшихся турниров сделать текущим."
      />
    </>
  );
}
