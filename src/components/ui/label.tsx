import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  variant = "default",
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  variant?: "default" | "brand";
}) {
  return (
    <label
      className={cn("text-sm font-medium text-white/90", className)}
      {...props}
    />
  );
}
