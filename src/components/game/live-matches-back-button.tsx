"use client";

import { PageBackButton } from "@/components/layout/page-back-button";
import { gamePath } from "@/lib/game-path";

export function LiveMatchesBackButton({ inviteCode }: { inviteCode: string }) {
  return <PageBackButton fallbackHref={gamePath(inviteCode, "live")} />;
}
