import { Alert, AlertDescription } from "@/components/ui/alert";

export function GameOversightBanner() {
  return (
    <Alert className="mb-6 border-brand-cyan/30 bg-brand-cyan/5 text-brand-muted">
      <AlertDescription>
        <p className="font-medium text-white">Просмотр в режиме суперадмина</p>
      </AlertDescription>
    </Alert>
  );
}
