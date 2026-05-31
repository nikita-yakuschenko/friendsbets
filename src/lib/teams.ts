export type TeamLike = {
  name: string;
  countryCode?: string | null;
};

function normalizeFlagCode(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  const code = countryCode.trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{3})?$/.test(code)) return null;
  return code;
}

export function getFlagImageUrl(countryCode: string | null | undefined): string | null {
  const code = normalizeFlagCode(countryCode);
  if (!code) return null;
  return `https://flagcdn.com/24x18/${code}.png`;
}

export function getFlagImageSrcSet(countryCode: string | null | undefined): string | null {
  const code = normalizeFlagCode(countryCode);
  if (!code) return null;
  return `https://flagcdn.com/48x36/${code}.png 2x`;
}
