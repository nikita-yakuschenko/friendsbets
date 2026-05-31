const USA_COUNTRY_PATTERN = /^(США|USA|U\.S\.A\.|US)$/i;

function splitLocationParts(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Убирает штат из записей вида «Город, Штат, США». */
export function normalizeVenueCityParts(parts: string[]): string {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  if (parts.length === 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  const country = parts[parts.length - 1] ?? "";
  if (USA_COUNTRY_PATTERN.test(country)) {
    return `${parts[0]}, ${country}`;
  }

  return parts.join(", ");
}

export function normalizeVenueCity(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeVenueCityParts(splitLocationParts(value));
  return normalized || null;
}

export function formatMatchVenue(
  venueName: string | null,
  venueCity: string | null,
): string | null {
  const city = normalizeVenueCity(venueCity);

  if (venueName && city) {
    return `Стадион ${venueName}, ${city}`;
  }
  if (venueName) {
    return `Стадион ${venueName}`;
  }
  return city;
}
