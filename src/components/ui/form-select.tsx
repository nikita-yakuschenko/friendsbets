import type { SelectHTMLAttributes } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export function FormSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "flex h-11 w-full cursor-pointer appearance-none rounded-xl border border-brand-neutral bg-brand-bg py-2 pl-4 pr-12 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:cursor-not-allowed disabled:opacity-50 [&::-ms-expand]:hidden",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <IconChevronDown
        className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-brand-muted"
        stroke={1.75}
        aria-hidden
      />
    </div>
  );
}
