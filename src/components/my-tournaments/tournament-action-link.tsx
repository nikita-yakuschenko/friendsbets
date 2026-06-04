import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type TournamentActionVariant = "primary" | "secondary" | "danger";

const variantClass: Record<TournamentActionVariant, string> = {
  primary: "text-brand-lime",
  secondary: "text-brand-cyan",
  danger: "text-brand-red",
};

/** Единый вид текстовых действий в «Мои турниры» (без Button/padding). */
export function tournamentActionLinkClass(
  variant: TournamentActionVariant,
  className?: string,
) {
  return cn(
    "block w-full bg-transparent p-0 text-right text-sm font-medium leading-snug",
    "border-0 shadow-none hover:underline",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/60",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline",
    variantClass[variant],
    className,
  );
}

export function TournamentActionButton({
  children,
  onClick,
  disabled,
  variant,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: TournamentActionVariant;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={tournamentActionLinkClass(variant, className)}
    >
      {children}
    </button>
  );
}

export function TournamentActionNavLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: TournamentActionVariant;
  className?: string;
}) {
  return (
    <Link href={href} className={tournamentActionLinkClass(variant, className)}>
      {children}
    </Link>
  );
}
