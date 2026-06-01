"use client";

import * as React from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { variant?: "default" | "brand" }
>(({ className, variant = "default", ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        variant={variant}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors",
          variant === "brand"
            ? "text-brand-muted hover:text-white"
            : "text-brand-muted hover:text-white",
        )}
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        tabIndex={-1}
      >
        {visible ? (
          <IconEyeOff className="h-5 w-5" stroke={1.75} aria-hidden="true" />
        ) : (
          <IconEye className="h-5 w-5" stroke={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
