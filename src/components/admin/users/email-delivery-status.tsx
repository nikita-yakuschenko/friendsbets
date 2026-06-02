import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EmailDeliveryMode } from "@/lib/email";

export function EmailDeliveryStatus({
  mode,
}: {
  mode: EmailDeliveryMode;
}) {
  if (mode === "smtp") {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/10">
        <p className="mb-1 font-medium text-emerald-200">Почта: SMTP</p>
        <AlertDescription>
          Напоминания и тестовые письма уходят через настроенный SMTP. Кнопка
          «Тест» в таблице отправляет проверочное письмо на email пользователя.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-500/30 bg-amber-500/10">
      <p className="mb-1 font-medium text-amber-200">Почта: только консоль</p>
      <AlertDescription>
        <code className="text-amber-100">SMTP_HOST</code> и{" "}
        <code className="text-amber-100">SMTP_FROM</code> не заданы — письма не
        уходят наружу, а пишутся в лог сервера как{" "}
        <code className="text-amber-100">[email:mock]</code>. Задайте SMTP в{" "}
        <code className="text-amber-100">.env</code>, перезапустите приложение
        и снова нажмите «Тест».
      </AlertDescription>
    </Alert>
  );
}
