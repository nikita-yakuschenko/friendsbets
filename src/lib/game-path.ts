export function gamePath(slug: string, segment?: string): string {
  const base = `/game/${slug}`;
  return segment ? `${base}/${segment}` : base;
}
