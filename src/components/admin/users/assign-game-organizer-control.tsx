"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconUserPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import type { AdminGameOption, AdminUserGameRef } from "@/components/admin/users/types";
import { assignGameOrganizerAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AssignGameOrganizerControl({
  userId,
  userName,
  organizerGameIds,
  allGames,
  className,
  compact = false,
}: {
  userId: string;
  userName: string;
  participantGames?: AdminUserGameRef[];
  organizerGameIds: Set<string>;
  allGames: AdminGameOption[];
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedGameId, setSelectedGameId] = useState("");

  const refresh = () => router.refresh();

  const assignableGames = useMemo(
    () => allGames.filter((g) => !organizerGameIds.has(g.id)),
    [allGames, organizerGameIds],
  );

  if (assignableGames.length === 0) {
    return <span className="text-sm text-brand-muted">Все турниры — орг.</span>;
  }

  function submitAssign() {
    if (!selectedGameId) {
      toast.error("Выберите турнир.");
      return;
    }
    startTransition(async () => {
      const result = await assignGameOrganizerAction(userId, selectedGameId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setSelectedGameId("");
      refresh();
    });
  }

  if (compact) {
    return (
      <div className={cn("flex max-w-[13rem] items-center gap-1", className)}>
        <FormSelect
          id={`assign-org-${userId}`}
          value={selectedGameId}
          disabled={pending}
          className="h-8 min-w-0 flex-1 text-xs"
          onChange={(e) => setSelectedGameId(e.target.value)}
        >
          <option value="">Турнир…</option>
          {assignableGames.map((game) => (
            <option key={game.id} value={game.id}>
              {game.title}
            </option>
          ))}
        </FormSelect>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-8 min-h-8 min-w-8 shrink-0 p-0"
          disabled={pending || !selectedGameId}
          title="Назначить организатором"
          onClick={submitAssign}
        >
          <IconUserPlus className="size-4" stroke={1.75} aria-hidden />
          <span className="sr-only">Назначить организатором</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full max-w-xs flex-col gap-2", className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`assign-org-${userId}`} className="text-xs text-brand-muted">
          Турнир для {userName.split(" ")[0]}
        </Label>
        <FormSelect
          id={`assign-org-${userId}`}
          value={selectedGameId}
          disabled={pending}
          onChange={(e) => setSelectedGameId(e.target.value)}
        >
          <option value="">Выберите турнир…</option>
          {assignableGames.map((game) => (
            <option key={game.id} value={game.id}>
              {game.title}
            </option>
          ))}
        </FormSelect>
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={pending || !selectedGameId}
          onClick={submitAssign}
        >
          {pending ? "Назначаем…" : "Назначить организатором"}
        </Button>
      </div>
    </div>
  );
}
