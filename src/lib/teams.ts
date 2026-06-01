export type TeamLike = {
  name: string;
  countryCode?: string | null;
};

export {
  getFlagImageSrcSet,
  getFlagImageUrl,
  normalizeFlagCode,
} from "@/lib/flag-proxy";
