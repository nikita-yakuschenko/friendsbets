"use client";

import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/** Назад по истории браузера; если некуда — `fallbackHref`. */
export function PageBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleBack}>
      <IconArrowLeft className="h-4 w-4 shrink-0" stroke={1.75} aria-hidden />
      Назад
    </Button>
  );
}
