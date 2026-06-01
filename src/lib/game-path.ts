/** Публичный идентификатор турнира в URL — invite-код (латиница и цифры). */
export function gamePath(inviteCode: string, segment?: string): string {
  const base = `/game/${inviteCode}`;
  return segment ? `${base}/${segment}` : base;
}

export function gameRouteSegmentFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/^\/game\/[^/]+\/(.+)$/);
  return match?.[1];
}
