/** ISO 3166-1 alpha-2 (+ optional subdivision, e.g. gb-sct). */
export function normalizeFlagCode(
  countryCode: string | null | undefined,
): string | null {
  if (!countryCode) return null;
  const code = countryCode.trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{3})?$/.test(code)) return null;
  return code;
}

const FLAG_CDN_SIZES = {
  1: "24x18",
  2: "48x36",
} as const;

export function getFlagCdnUrl(code: string, scale: 1 | 2 = 1): string {
  const size = FLAG_CDN_SIZES[scale];
  return `https://flagcdn.com/${size}/${code}.png`;
}

export function getFlagProxyPath(
  countryCode: string | null | undefined,
  scale: 1 | 2 = 1,
): string | null {
  const code = normalizeFlagCode(countryCode);
  if (!code) return null;
  const base = `/api/flags/${encodeURIComponent(code)}`;
  return scale === 2 ? `${base}?scale=2` : base;
}

export function getFlagProxySrcSet(
  countryCode: string | null | undefined,
): string | null {
  const hiRes = getFlagProxyPath(countryCode, 2);
  if (!hiRes) return null;
  return `${hiRes} 2x`;
}
