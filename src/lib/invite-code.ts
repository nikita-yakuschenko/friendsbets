const INVITE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_INVITE_LENGTH = 6;
const MIN_INVITE_LENGTH = 4;
const MAX_INVITE_LENGTH = 32;

export function generateRandomInviteCode(
  length: number = DEFAULT_INVITE_LENGTH,
): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * INVITE_CHARSET.length);
    code += INVITE_CHARSET[index];
  }
  return code;
}

export function normalizeInviteCodeInput(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateInviteCodeFormat(code: string): string | null {
  const normalized = normalizeInviteCodeInput(code);
  if (normalized.length < MIN_INVITE_LENGTH) {
    return `Invite-код: минимум ${MIN_INVITE_LENGTH} символа (латиница и цифры).`;
  }
  if (normalized.length > MAX_INVITE_LENGTH) {
    return `Invite-код: максимум ${MAX_INVITE_LENGTH} символа.`;
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return "Invite-код: только латинские буквы и цифры, без пробелов и спецсимволов.";
  }
  return null;
}

export { DEFAULT_INVITE_LENGTH, MAX_INVITE_LENGTH, MIN_INVITE_LENGTH };
