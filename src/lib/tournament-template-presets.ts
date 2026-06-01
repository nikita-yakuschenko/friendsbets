import {
  CHAMPIONAT_WORLD_CUP_2026,
  championatCalendarUrl,
} from "@/lib/football-api/championat/constants";

export const SYSTEM_TEMPLATE_WC_2026 = {
  slug: "wc-2026",
  title: CHAMPIONAT_WORLD_CUP_2026.officialTitle,
  description: "ЧМ-2026 · календарь на Championat",
  championatUrl: championatCalendarUrl(
    CHAMPIONAT_WORLD_CUP_2026.tournamentId,
    CHAMPIONAT_WORLD_CUP_2026.sportSlug,
  ),
} as const;
