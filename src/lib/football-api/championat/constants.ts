export const CHAMPIONAT_WORLD_CUP_2026 = {
  tournamentId: 6858,
  sportSlug: "_worldcup",
  /** Полное наименование на Championat / FIFA. */
  officialTitle: "Чемпионат мира по футболу 2026",
} as const;

export function championatCalendarUrl(
  tournamentId: number = CHAMPIONAT_WORLD_CUP_2026.tournamentId,
  sportSlug: string = CHAMPIONAT_WORLD_CUP_2026.sportSlug,
): string {
  return `https://www.championat.com/football/${sportSlug}/tournament/${tournamentId}/calendar/`;
}

export function championatMatchExternalId(matchId: number | string): string {
  return `championat:${matchId}`;
}

export function championatTeamExternalId(teamId: number | string): string {
  return `championat:${teamId}`;
}

export function championatSlotExternalId(slot: string): string {
  return `championat:slot:${slot.trim()}`;
}

export function championatTournamentExternalId(
  tournamentId: number = CHAMPIONAT_WORLD_CUP_2026.tournamentId,
): string {
  return `championat:tournament:${tournamentId}`;
}
