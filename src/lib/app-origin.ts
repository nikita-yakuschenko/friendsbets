/** Хосты за reverse proxy (Traefik/Dokploy), когда приложение видит localhost. */
const INTERNAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function getAppOriginFromEnv(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function originFromHost(host: string | null, proto: string | null): string | null {
  const h = host?.split(",")[0]?.trim();
  if (!h) return null;
  const hostname = h.includes(":") ? h.slice(0, h.indexOf(":")) : h;
  if (INTERNAL_HOST_RE.test(h) || INTERNAL_HOST_RE.test(hostname)) {
    return null;
  }
  const scheme = (proto?.split(",")[0]?.trim() || "https").replace(/:$/, "");
  return `${scheme}://${h}`;
}

/** Для Route Handlers и Server Actions (headers / Request). */
export function getAppOriginFromHeaders(headers: Headers): string {
  return (
    originFromHost(
      headers.get("x-forwarded-host"),
      headers.get("x-forwarded-proto"),
    ) ??
    originFromHost(headers.get("host"), headers.get("x-forwarded-proto")) ??
    getAppOriginFromEnv()
  );
}

export function getAppOriginFromRequest(request: Request): string {
  return getAppOriginFromHeaders(request.headers);
}

export function absoluteAppUrl(path: string, origin?: string): string {
  const base = (origin ?? getAppOriginFromEnv()).replace(/\/$/, "");
  return new URL(path.startsWith("/") ? path : `/${path}`, base).toString();
}
