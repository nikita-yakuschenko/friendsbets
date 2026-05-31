import { cn } from "@/lib/utils";

export function ContentContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6", className)}>
      {children}
    </div>
  );
}
