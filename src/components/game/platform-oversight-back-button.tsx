"use client";

import { PageBackButton } from "@/components/layout/page-back-button";

const FALLBACK_HREF = "/admin?tab=games";

export function PlatformOversightBackButton() {
  return <PageBackButton fallbackHref={FALLBACK_HREF} />;
}
