"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const FALLBACK_HREF = "/admin?tab=games";

/** Назад по истории браузера; если некуда — список игр платформы. */
export function PlatformOversightBackButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(FALLBACK_HREF);
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleBack}>
      Назад
    </Button>
  );
}
