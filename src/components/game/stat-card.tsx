import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("font-bold italic tabular-nums", className)}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  children,
  className,
  centered = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}) {
  return (
    <Card className={cn("relative", className)}>
      <Badge
        variant="default"
        className="absolute right-4 top-4 z-10 border-brand-lime/50 bg-brand-lime/15 text-brand-lime"
      >
        {label}
      </Badge>
      <CardContent
        className={cn(
          "flex flex-col px-4 pb-6 pt-10",
          centered ? "items-center text-center" : "items-start text-left",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
