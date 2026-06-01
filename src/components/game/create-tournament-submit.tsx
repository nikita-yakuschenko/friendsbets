"use client";

import { IconBallFootball } from "@tabler/icons-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function CreateTournamentSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2.5">
          <IconBallFootball
            className="football-bounce h-5 w-5 shrink-0"
            stroke={1.75}
            aria-hidden
          />
          <span>Создаём турнир…</span>
        </span>
      ) : (
        "Создать турнир"
      )}
    </Button>
  );
}
