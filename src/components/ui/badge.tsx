import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-brand-lime/30 bg-brand-lime/10 text-brand-lime",
        secondary: "border-brand-neutral bg-brand-bg text-brand-muted",
        outline: "border-brand-neutral text-brand-muted",
        warning: "border-brand-lime/40 bg-brand-lime/10 text-brand-lime",
        destructive: "border-brand-red/40 bg-brand-red/10 text-brand-red",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
