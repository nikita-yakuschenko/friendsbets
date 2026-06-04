"use client";

import { PageBackButton } from "@/components/layout/page-back-button";
import { gamePath } from "@/lib/game-path";

export function TournamentManageBackButton({
  inviteCode,
  platformOversight,
}: {
  inviteCode: string;
  platformOversight: boolean;
}) {
  const fallbackHref = platformOversight
    ? "/admin?tab=games"
    : gamePath(inviteCode);

  return <PageBackButton fallbackHref={fallbackHref} />;
}
