import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { gamePlatformViewPath } from "@/lib/game-platform-view";
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
          <Link
            href={gamePlatformViewPath(game.inviteCode)}
            className="inline-flex max-w-full"
            title={`Открыть просмотр: ${game.title}`}
          >
            <Badge
              variant={variant === "organizer" ? "default" : "secondary"}
              className="max-w-full truncate font-normal"
            >
              {game.title}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
