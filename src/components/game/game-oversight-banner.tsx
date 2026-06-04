import { Alert, AlertDescription } from "@/components/ui/alert";

export function GameOversightBanner({
  variant = "platform",
}: {
  variant?: "platform" | "organizer";
}) {
  const title =
    variant === "platform"
      ? "Просмотр в режиме суперадмина"
      : "Управление турниром (организатор)";

  return (
    <Alert className="mb-6 border-brand-cyan/30 bg-brand-cyan/5 text-brand-muted">
      <AlertDescription>
        <p className="font-medium text-white">{title}</p>
      </AlertDescription>
    </Alert>
  );
}
