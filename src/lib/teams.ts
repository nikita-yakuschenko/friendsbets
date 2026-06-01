export type TeamLike = {
  name: string;
  countryCode?: string | null;
};

export { normalizeFlagCode } from "@/lib/flag-proxy";

import { getFlagProxyPath, getFlagProxySrcSet } from "@/lib/flag-proxy";

export function getFlagImageUrl(countryCode: string | null | undefined): string | null {
  return getFlagProxyPath(countryCode);
}

export function getFlagImageSrcSet(countryCode: string | null | undefined): string | null {
  return getFlagProxySrcSet(countryCode);
}
