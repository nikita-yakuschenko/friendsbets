import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { variant?: "default" | "brand" }
>(({ className, type, variant = "default", ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-xl border border-brand-neutral bg-brand-bg px-4 py-2 text-base text-white placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:cursor-not-allowed disabled:opacity-50",
      variant === "brand" && "h-12",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
