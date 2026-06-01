/** Человекочитаемые подписи для слотов сетки Championat (2A, 1C, 3ABCDF). */
export function formatBracketSlotLabel(code: string): string {
  const slot = code.trim().toUpperCase();
  if (!slot) return code;

  const match = slot.match(/^(\d)([A-Z]+)$/);
  if (!match) return code;

  const place = Number(match[1]);
  const groups = match[2].split("");

  const placeLabel =
    place === 1
      ? "1-е место"
      : place === 2
        ? "2-е место"
        : place === 3
          ? "3-е место"
          : `${place}-е место`;

  if (groups.length === 1) {
    return `${placeLabel}, группа ${groups[0]}`;
  }

  return `${placeLabel} (группы ${groups.join(", ")})`;
}
