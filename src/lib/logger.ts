/** Минимальные структурированные логи без внешних зависимостей. */

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

export function logOperation(
  operation: string,
  fields: Record<string, string | number | boolean | undefined>,
) {
  const payload = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined),
  );
  console.info(`[${operation}]`, JSON.stringify(payload));
}

export function logOperationError(
  operation: string,
  error: unknown,
  fields?: Record<string, string | number | boolean | undefined>,
) {
  const message = error instanceof Error ? error.message : String(error);
  logOperation(operation, { ...fields, error: message, level: "error" });
}
