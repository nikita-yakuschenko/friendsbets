import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gamePath } from "@/lib/game-path";
import type { GameJoinPreview } from "@/lib/join-game-preview";

export function JoinGamePreviewCard({
  preview,
  joinPending,
  onSearchAnother,
}: {
  preview: GameJoinPreview;
  joinPending?: boolean;
  onSearchAnother: () => void;
}) {
  return (
    <Card className="border-brand-cyan/30">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
          Найден турнир
        </p>
        <CardTitle className="text-xl text-white">{preview.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-brand-muted">Организатор</dt>
            <dd className="text-right font-medium text-white">{preview.organizerName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-brand-muted">Правила очков</dt>
            <dd className="text-right text-white">{preview.scoringRuleTitle}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-brand-muted">Участников</dt>
            <dd className="text-right text-white">{preview.participantsCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-brand-muted">Invite-код</dt>
            <dd>
              <Badge variant="secondary" className="font-mono">
                {preview.inviteCode}
              </Badge>
            </dd>
          </div>
        </dl>

        {preview.alreadyMember ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-muted">
              Вы уже участник этого турнира.
            </p>
            <Link
              href={gamePath(preview.inviteCode)}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-lime text-sm font-semibold text-brand-bg"
            >
              Перейти в турнир
            </Link>
          </div>
        ) : (
          <p className="text-sm text-brand-muted">
            Это тот турнир? Нажмите «Вступить» — только после этого вы станете
            участником.
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full text-brand-muted"
          onClick={onSearchAnother}
          disabled={joinPending}
        >
          Искать другой код
        </Button>
      </CardContent>
    </Card>
  );
}
