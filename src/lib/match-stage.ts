/** Групповой этап Championat: «Группа A · Тур 1». */
export function isGroupStage(stage: string | null | undefined): boolean {
  if (!stage) return false;
  return /^группа\s+[a-zа-я]/iu.test(stage.trim());
}

/** Плей-офф: любая стадия, кроме групповой (1/8, 1/4, финал и т.д.). */
export function isKnockoutStage(stage: string | null | undefined): boolean {
  if (!stage) return false;
  return !isGroupStage(stage);
}
