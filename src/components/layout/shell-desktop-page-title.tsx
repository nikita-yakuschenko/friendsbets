"use client";

import { usePathname } from "next/navigation";
import { resolveDesktopHeaderTitle } from "@/lib/shell-page-title";

export function ShellDesktopPageTitle() {
  const pathname = usePathname();
  const title = resolveDesktopHeaderTitle(pathname);

  if (!title) return null;

  return (
    <h1 className="brand-display hidden text-2xl leading-tight text-white md:block md:text-3xl">
      {title}
    </h1>
  );
}
