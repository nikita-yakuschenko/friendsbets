/** ISO 3166-1 alpha-2 (+ subdivisions flagcdn, напр. gb-sct). Названия как на Championat. */
const COUNTRY_CODE_BY_TEAM_NAME: Record<string, string> = {
  "Австралия": "AU",
  "Австрия": "AT",
  "Алжир": "DZ",
  "Англия": "gb-eng",
  "Аргентина": "AR",
  "Бельгия": "BE",
  "Боливия": "BO",
  "Босния и Герцеговина": "BA",
  "Бразилия": "BR",
  "Венесуэла": "VE",
  "Гаити": "HT",
  "Гана": "GH",
  "Германия": "DE",
  "Гондурас": "HN",
  "Греция": "GR",
  "Дания": "DK",
  "Египет": "EG",
  "Иордания": "JO",
  "Иран": "IR",
  "Ирак": "IQ",
  "Испания": "ES",
  "Италия": "IT",
  "Кабо-Верде": "CV",
  "Камерун": "CM",
  "Канада": "CA",
  "Катар": "QA",
  "Колумбия": "CO",
  "Коста-Рика": "CR",
  "Кот-д'Ивуар": "CI",
  "Кюрасао": "CW",
  "Марокко": "MA",
  "Мексика": "MX",
  "Нигерия": "NG",
  "Нидерланды": "NL",
  "Новая Зеландия": "NZ",
  "Норвегия": "NO",
  "Панама": "PA",
  "Парагвай": "PY",
  "Перу": "PE",
  "Польша": "PL",
  "Португалия": "PT",
  "Россия": "RU",
  "Саудовская Аравия": "SA",
  "Сенегал": "SN",
  "Сербия": "RS",
  "США": "US",
  "Тунис": "TN",
  "Турция": "TR",
  "Украина": "UA",
  "Уругвай": "UY",
  "Узбекистан": "UZ",
  "Франция": "FR",
  "Хорватия": "HR",
  "Чехия": "CZ",
  "Чили": "CL",
  "Швейцария": "CH",
  "Швеция": "SE",
  "Шотландия": "gb-sct",
  "Эквадор": "EC",
  "ЮАР": "ZA",
  "Южная Корея": "KR",
  "Япония": "JP",
  "ДР Конго": "CD",
};

export function resolveTeamCountryCode(teamName: string): string | undefined {
  return COUNTRY_CODE_BY_TEAM_NAME[teamName.trim()];
}

/** Код для флага: из БД или по русскому названию сборной. */
export function resolveTeamFlagCode(
  teamName: string,
  countryCode?: string | null,
): string | null {
  const trimmed = teamName.trim();
  const fromDb = countryCode?.trim();
  if (fromDb) return fromDb;
  return resolveTeamCountryCode(trimmed) ?? null;
}
