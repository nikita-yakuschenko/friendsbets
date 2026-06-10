export type TeamLike = {
  name: string;
  countryCode?: string | null;
};

export {
  getFlagImageSrcSet,
  getFlagImageUrl,
  normalizeFlagCode,
} from "@/lib/flag-proxy";
export { resolveTeamFlagCode } from "@/lib/football-api/championat/team-country-codes";
