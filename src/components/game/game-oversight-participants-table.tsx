"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  IconSettings,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  GAME_PARTICIPANT_ROLE,
  type GameParticipantRoleValue,
} from "@/lib/game-participant-role";
import { buildRegisterInviteUrl } from "@/lib/invite-url";
import {
  removeGameParticipantBySuperadminAction,
  setGameParticipantRoleBySuperadminAction,
} from "@/server/actions/game-oversight";

export type OversightParticipantRow = {
  userId: string;
  displayName: string;
  email: string;
  role: GameParticipantRoleValue;
};

function ParticipantRoleMenu({
  gameId,
  participant,
  organizerCount,
  onDone,
}: {
  gameId: string;
  participant: OversightParticipantRow;
  organizerCount: number;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isOrganizer = participant.role === GAME_PARTICIPANT_ROLE.ORGANIZER;
  const canDemote = isOrganizer && organizerCount > 1;
  const canPromote = !isOrganizer;

  function setRole(role: GameParticipantRoleValue) {
    startTransition(async () => {
      const result = await setGameParticipantRoleBySuperadminAction(
        gameId,
        participant.userId,
        role,
      );
      setOpen(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      onDone();
    });
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const itemCount = (canPromote ? 1 : 0) + (canDemote ? 1 : 0);
    const menuHeight = itemCount * 36 + 8;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + gap + 12;
    setMenuPos({
      top: openUp ? rect.top - menuHeight - gap : rect.bottom + gap,
      left: rect.right,
    });
    setOpen(true);
  }

  if (!canPromote && !canDemote) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        className="size-8 shrink-0 p-0 text-brand-muted"
        title="Нет доступных действий"
      >
        <IconSettings className="size-4 opacity-40" />
      </Button>
    );
  }

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-60 cursor-default"
              aria-label="Закрыть меню"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-70 min-w-44 rounded-lg border border-brand-neutral bg-brand-surface py-1 shadow-lg"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                transform: "translateX(-100%)",
              }}
              role="menu"
            >
              {canPromote ? (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-xs text-white hover:bg-brand-neutral/40"
                  disabled={pending}
                  onClick={() => setRole(GAME_PARTICIPANT_ROLE.ORGANIZER)}
                >
                  Назначить организатором
                </button>
              ) : null}
              {canDemote ? (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-xs text-white hover:bg-brand-neutral/40"
                  disabled={pending}
                  onClick={() => setRole(GAME_PARTICIPANT_ROLE.PARTICIPANT)}
                >
                  Сделать участником
                </button>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        className="size-8 shrink-0 p-0 text-brand-muted hover:text-white"
        disabled={pending}
        title="Роль участника"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggleMenu}
      >
        <IconSettings className="size-4" />
      </Button>
      {menu}
    </>
  );
}

function RemoveParticipantButton({
  gameId,
  participant,
  onDone,
}: {
  gameId: string;
  participant: OversightParticipantRow;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmRemove() {
    startTransition(async () => {
      const result = await removeGameParticipantBySuperadminAction(
        gameId,
        participant.userId,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      onDone();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-8 shrink-0 p-0 text-brand-muted hover:text-brand-red"
        disabled={pending}
        title="Исключить из турнира"
        onClick={() => setOpen(true)}
      >
        <IconTrash className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Исключить участника?</AlertDialogTitle>
            <AlertDialogDescription>
              {participant.displayName} будет удалён из турнира вместе с прогнозами.
              Действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={confirmRemove}
            >
              {pending ? "…" : "Исключить"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function GameOversightParticipantsTable({
  gameId,
  inviteCode,
  participants,
  organizerCount,
}: {
  gameId: string;
  inviteCode: string;
  participants: OversightParticipantRow[];
  organizerCount: number;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="rounded-2xl border border-brand-neutral bg-brand-surface">
      <div className="flex items-center justify-between gap-3 border-b border-brand-neutral/60 bg-brand-bg px-3 py-2.5 text-xs text-brand-muted sm:px-4 sm:text-sm">
        <span>
          Участники ·{" "}
          <span className="font-medium tabular-nums text-white">
            {participants.length}
          </span>
        </span>
        <InviteCodeCopyCell
          inviteCode={inviteCode}
          inviteLinkUrl={buildRegisterInviteUrl(inviteCode)}
          compact
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-xs sm:text-sm">
          <thead className="border-b border-brand-neutral/60 bg-brand-bg text-brand-muted">
            <tr>
              <th className="w-10 px-3 py-2.5 text-left font-medium sm:px-4 sm:py-3">
                #
              </th>
              <th className="px-3 py-2.5 text-left font-medium sm:px-4 sm:py-3">
                Участник
              </th>
              <th className="hidden px-3 py-2.5 text-left font-medium md:table-cell md:px-4 md:py-3">
                Email
              </th>
              <th className="w-18 px-2 py-2.5 text-right font-medium sm:px-3 sm:py-3">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, index) => {
              const isOrganizer =
                p.role === GAME_PARTICIPANT_ROLE.ORGANIZER;
              return (
                <tr
                  key={p.userId}
                  className="border-t border-brand-neutral/60"
                >
                  <td className="px-3 py-2.5 font-bold tabular-nums text-brand-lime sm:px-4 sm:py-3">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {isOrganizer ? (
                        <IconStarFilled
                          className="size-4 shrink-0 text-brand-lime"
                          title="Организатор"
                          aria-hidden
                        />
                      ) : (
                        <span
                          className="inline-block size-4 shrink-0"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <span
                          className="block truncate font-medium text-white"
                          title={p.displayName}
                        >
                          {p.displayName}
                        </span>
                        <span
                          className="mt-0.5 block truncate text-[11px] text-brand-muted md:hidden"
                          title={p.email}
                        >
                          {p.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 text-brand-muted md:table-cell md:px-4 md:py-3">
                    <span className="block truncate" title={p.email}>
                      {p.email}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <ParticipantRoleMenu
                        gameId={gameId}
                        participant={p}
                        organizerCount={organizerCount}
                        onDone={refresh}
                      />
                      <RemoveParticipantButton
                        gameId={gameId}
                        participant={p}
                        onDone={refresh}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
