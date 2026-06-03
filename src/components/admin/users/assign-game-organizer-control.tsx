"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
}: {
  userId: string;
  userName: string;
  participantGames?: AdminUserGameRef[];
  organizerGameIds: Set<string>;
  allGames: AdminGameOption[];
  className?: string;
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
