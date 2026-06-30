import { getFlagImageSrcSet, getFlagImageUrl } from "@/lib/teams";

export function ParticipantChampionFlag({
  countryCode,
}: {
  countryCode: string | null | undefined;
}) {
  if (!countryCode) return null;

  const flagUrl = getFlagImageUrl(countryCode);
  if (!flagUrl) return null;

  return (
    <span
      className="relative ml-1 inline-block align-baseline"
      title="Прогноз на чемпиона"
      aria-label="Прогноз на чемпиона"
    >
      <img
        src={flagUrl}
        srcSet={getFlagImageSrcSet(countryCode) ?? undefined}
        width={18}
        height={12}
        alt=""
        aria-hidden
        className="relative -top-1 inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
