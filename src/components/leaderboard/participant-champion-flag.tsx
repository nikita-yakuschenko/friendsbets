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
    <sup
      className="ml-1 inline-flex align-super"
      title="Прогноз на чемпиона"
      aria-label="Прогноз на чемпиона"
    >
      <img
        src={flagUrl}
        srcSet={getFlagImageSrcSet(countryCode) ?? undefined}
        width={14}
        height={10}
        alt=""
        aria-hidden
        className="inline-block h-2.5 w-3.5 rounded-[2px] object-cover"
        loading="lazy"
        decoding="async"
      />
    </sup>
  );
}
