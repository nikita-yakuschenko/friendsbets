/** Единая нормализация email для login/register/reset (защита от дублей и невидимых символов). */
export function normalizeUserEmail(raw: string): string {
  return raw
    .trim()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
}
