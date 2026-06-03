import Link from "next/link";
import { DeleteGameButton } from "@/components/admin/delete-game-button";
import {
  AdminCardDetails,
  AdminCardFooter,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import type { AdminGameRow } from "@/components/admin/games/types";
import { cn, formatDateTimeWithYear } from "@/lib/utils";

export function AdminGameCard({ game }: { game: AdminGameRow }) {
  return (
    <AdminRecordCard
      className={cn(
        "group relative transition-colors",
        "hover:border-brand-lime/40",
      )}
    >
      <Link
        href={game.openHref}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Открыть турнир ${game.title}`}
      />

      <header className="relative">
        <p className="text-base font-medium leading-snug text-white transition-colors group-hover:text-brand-lime">
          {game.title}
        </p>
      </header>

      <AdminCardDetails className="relative pointer-events-none">
        <AdminDetailRow label="Инвайт-код">
          <div className="pointer-events-auto">
            <InviteCodeCopyCell
              inviteCode={game.inviteCode}
              inviteLinkUrl={game.inviteLinkUrl}
              compact
            />
          </div>
        </AdminDetailRow>
        <AdminDetailRow label="Участники">
          <span className="tabular-nums">{game.participantsCount}</span>
        </AdminDetailRow>
        <AdminDetailRow label="Правила">
          {game.scoringRuleTitle}
        </AdminDetailRow>
        <AdminDetailRow label="Создатель">{game.createdByName}</AdminDetailRow>
        <AdminDetailRow label={game.organizerLabel}>
          {game.organizerNames || (
            <span className="text-brand-muted">—</span>
          )}
        </AdminDetailRow>
        <AdminDetailRow label="Создан">
          <span className="text-brand-muted tabular-nums">
            {formatDateTimeWithYear(new Date(game.createdAt))}
          </span>
        </AdminDetailRow>
      </AdminCardDetails>

      <AdminCardFooter className="relative">
        <span className="text-sm font-medium text-brand-lime">Открыть</span>
        <div className="pointer-events-auto">
          <DeleteGameButton
            gameId={game.id}
            gameTitle={game.title}
            inviteCode={game.inviteCode}
          />
        </div>
      </AdminCardFooter>
    </AdminRecordCard>
  );
}
