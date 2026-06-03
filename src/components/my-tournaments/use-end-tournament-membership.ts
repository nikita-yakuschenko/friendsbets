"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import type { TournamentPickOption } from "@/components/my-tournaments/types";
import type { MembershipEndResult } from "@/lib/apply-active-after-membership-end";

export function useEndTournamentMembership({
  isActive,
  otherTournaments,
  execute,
  successMessage,
}: {
  isActive: boolean;
  otherTournaments: TournamentPickOption[];
  execute: (nextActiveInviteCode?: string) => Promise<MembershipEndResult>;
  successMessage: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [selectedInviteCode, setSelectedInviteCode] = useState<string | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const needsPick = isActive && otherTournaments.length >= 2;

  const runExecute = useCallback(
    (nextActiveInviteCode?: string) => {
      startTransition(async () => {
        const result = await execute(nextActiveInviteCode);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(successMessage);
        setConfirmOpen(false);
        setPickOpen(false);
        setSelectedInviteCode(null);
        if (result.clearedAllGames) {
          router.push("/");
        }
        router.refresh();
      });
    },
    [execute, router, successMessage],
  );

  function handleConfirm() {
    if (needsPick) {
      setConfirmOpen(false);
      setPickOpen(true);
      return;
    }
    const autoNext =
      isActive && otherTournaments.length === 1
        ? otherTournaments[0]!.inviteCode
        : undefined;
    runExecute(autoNext);
  }

  function handlePickConfirm() {
    if (!selectedInviteCode) {
      toast.error("Выберите турнир из списка.");
      return;
    }
    runExecute(selectedInviteCode);
  }

  return {
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
  };
}
