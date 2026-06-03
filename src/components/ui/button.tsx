import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 min-h-11 px-5",
  {
    variants: {
      variant: {
        default:
          "bg-brand-lime text-black hover:brightness-110 focus-visible:ring-brand-lime",
        secondary:
          "border border-brand-neutral bg-transparent text-white hover:bg-brand-neutral/40 focus-visible:ring-brand-neutral",
        outline:
          "border border-brand-neutral bg-transparent text-white hover:bg-brand-neutral/40 focus-visible:ring-brand-neutral",
        ghost: "text-white hover:bg-brand-neutral/40",
        brand:
          "bg-brand-lime text-black hover:brightness-110 focus-visible:ring-brand-lime",
        brandSecondary:
          "border border-brand-neutral bg-transparent text-white hover:bg-brand-neutral/40",
        brandBlue:
          "bg-brand-blue text-white hover:brightness-110 focus-visible:ring-brand-blue",
        destructive:
          "bg-brand-red text-white hover:brightness-110 focus-visible:ring-brand-red",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3 text-sm",
        lg: "h-12 rounded-xl px-6 text-lg",
        icon: "size-11 min-w-11 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
