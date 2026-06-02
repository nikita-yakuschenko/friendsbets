import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { gamePath } from "@/lib/game-path";
import type { AdminUserGameRef } from "@/components/admin/users/types";

export function GameMembershipList({
  games,
  variant,
}: {
  games: AdminUserGameRef[];
  variant: "organizer" | "participant";
}) {
  if (games.length === 0) {
    return <span className="text-sm text-brand-muted">—</span>;
  }

  return (
    <ul className="flex max-w-xs flex-col gap-1.5">
      {games.map((game) => (
        <li key={game.id}>
          <Link href={gamePath(game.inviteCode)} className="inline-flex max-w-full">
            <Badge
              variant={variant === "organizer" ? "default" : "secondary"}
              className="max-w-full truncate font-normal"
              title={game.title}
            >
              {game.title}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
