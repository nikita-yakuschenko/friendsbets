import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <Link
      href="/"
      className={cn(
        "brand-display inline-block leading-none tracking-tight whitespace-nowrap",
        sizes[size],
        className,
      )}
    >
      <span className="text-white">friends</span>
      <span className="text-brand-lime">bets</span>
    </Link>
  );
}
