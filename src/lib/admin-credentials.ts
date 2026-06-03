/** Email и пароль суперадмина из env (seed / сброс пароля). */
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "admin@friendsbets.local")
    .trim()
    .toLowerCase();
}

/** Пустой ADMIN_PASSWORD в .env → дефолт admin123456 (как в README). */
export function getAdminPassword(): string {
  const raw = process.env.ADMIN_PASSWORD?.trim();
  if (raw) return raw;
  return "admin123456";
}
