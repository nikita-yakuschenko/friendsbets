/**
 * Падежи русских названий сборных для текстов UI (за/на/в, победа, у).
 * Ключ — номинатив как в БД/Championat.
 */
export type TeamGender = "f" | "m" | "pl";

type TeamGrammaticalForms = {
  accusative: string;
  genitive: string;
  gender: TeamGender;
};

const TEAM_FORMS: Record<string, TeamGrammaticalForms> = {
  Австралия: { accusative: "Австралию", genitive: "Австралии", gender: "f" },
  Австрия: { accusative: "Австрию", genitive: "Австрии", gender: "f" },
  Алжир: { accusative: "Алжир", genitive: "Алжира", gender: "m" },
  Англия: { accusative: "Англию", genitive: "Англии", gender: "f" },
  Аргентина: { accusative: "Аргентину", genitive: "Аргентины", gender: "f" },
  Бельгия: { accusative: "Бельгию", genitive: "Бельгии", gender: "f" },
  Боливия: { accusative: "Боливию", genitive: "Боливии", gender: "f" },
  "Босния и Герцеговина": {
    accusative: "Боснию и Герцеговину",
    genitive: "Боснии и Герцеговины",
    gender: "f",
  },
  Бразилия: { accusative: "Бразилию", genitive: "Бразилии", gender: "f" },
  Венесуэла: { accusative: "Венесуэлу", genitive: "Венесуэлы", gender: "f" },
  Гаити: { accusative: "Гаити", genitive: "Гаити", gender: "f" },
  Гана: { accusative: "Гану", genitive: "Ганы", gender: "f" },
  Германия: { accusative: "Германию", genitive: "Германии", gender: "f" },
  Гондурас: { accusative: "Гондурас", genitive: "Гондураса", gender: "m" },
  Греция: { accusative: "Грецию", genitive: "Греции", gender: "f" },
  Дания: { accusative: "Данию", genitive: "Дании", gender: "f" },
  "ДР Конго": { accusative: "ДР Конго", genitive: "ДР Конго", gender: "m" },
  Египет: { accusative: "Египет", genitive: "Египта", gender: "m" },
  Иордания: { accusative: "Иорданию", genitive: "Иордании", gender: "f" },
  Иран: { accusative: "Иран", genitive: "Ирана", gender: "m" },
  Ирак: { accusative: "Ирак", genitive: "Ирака", gender: "m" },
  Испания: { accusative: "Испанию", genitive: "Испании", gender: "f" },
  Италия: { accusative: "Италию", genitive: "Италии", gender: "f" },
  "Кабо-Верде": { accusative: "Кабо-Верде", genitive: "Кабо-Верде", gender: "f" },
  Камерун: { accusative: "Камерун", genitive: "Камеруна", gender: "m" },
  Канада: { accusative: "Канаду", genitive: "Канады", gender: "f" },
  Катар: { accusative: "Катар", genitive: "Катара", gender: "m" },
  Колумбия: { accusative: "Колумбию", genitive: "Колумбии", gender: "f" },
  "Коста-Рика": { accusative: "Коста-Рику", genitive: "Коста-Рики", gender: "f" },
  "Кот-д'Ивуар": { accusative: "Кот-д'Ивуар", genitive: "Кот-д'Ивуара", gender: "m" },
  Кюрасао: { accusative: "Кюрасао", genitive: "Кюрасао", gender: "m" },
  Марокко: { accusative: "Марокко", genitive: "Марокко", gender: "m" },
  Мексика: { accusative: "Мексику", genitive: "Мексики", gender: "f" },
  Нигерия: { accusative: "Нигерию", genitive: "Нигерии", gender: "f" },
  Нидерланды: { accusative: "Нидерланды", genitive: "Нидерландов", gender: "pl" },
  "Новая Зеландия": {
    accusative: "Новую Зеландию",
    genitive: "Новой Зеландии",
    gender: "f",
  },
  Норвегия: { accusative: "Норвегию", genitive: "Норвегии", gender: "f" },
  Панама: { accusative: "Панаму", genitive: "Панамы", gender: "f" },
  Парагвай: { accusative: "Парагвай", genitive: "Парагвая", gender: "m" },
  Перу: { accusative: "Перу", genitive: "Перу", gender: "m" },
  Польша: { accusative: "Польшу", genitive: "Польши", gender: "f" },
  Португалия: { accusative: "Португалию", genitive: "Португалии", gender: "f" },
  Россия: { accusative: "Россию", genitive: "России", gender: "f" },
  "Саудовская Аравия": {
    accusative: "Саудовскую Аравию",
    genitive: "Саудовской Аравии",
    gender: "f",
  },
  Сенегал: { accusative: "Сенегал", genitive: "Сенегала", gender: "m" },
  Сербия: { accusative: "Сербию", genitive: "Сербии", gender: "f" },
  США: { accusative: "США", genitive: "США", gender: "pl" },
  Тунис: { accusative: "Тунис", genitive: "Туниса", gender: "m" },
  Турция: { accusative: "Турцию", genitive: "Турции", gender: "f" },
  Украина: { accusative: "Украину", genitive: "Украины", gender: "f" },
  Уругвай: { accusative: "Уругвай", genitive: "Уругвая", gender: "m" },
  Узбекистан: { accusative: "Узбекистан", genitive: "Узбекистана", gender: "m" },
  Франция: { accusative: "Францию", genitive: "Франции", gender: "f" },
  Хорватия: { accusative: "Хорватию", genitive: "Хорватии", gender: "f" },
  Чехия: { accusative: "Чехию", genitive: "Чехии", gender: "f" },
  Чили: { accusative: "Чили", genitive: "Чили", gender: "m" },
  Швейцария: { accusative: "Швейцарию", genitive: "Швейцарии", gender: "f" },
  Швеция: { accusative: "Швецию", genitive: "Швеции", gender: "f" },
  Шотландия: { accusative: "Шотландию", genitive: "Шотландии", gender: "f" },
  Эквадор: { accusative: "Эквадор", genitive: "Эквадора", gender: "m" },
  ЮАР: { accusative: "ЮАР", genitive: "ЮАР", gender: "f" },
  "Южная Корея": {
    accusative: "Южную Корею",
    genitive: "Южной Кореи",
    gender: "f",
  },
  Япония: { accusative: "Японию", genitive: "Японии", gender: "f" },
};

function guessAccusative(name: string): string {
  const trimmed = name.trim();
  if (/ия$/u.test(trimmed)) return trimmed.replace(/ия$/u, "ию");
  if (/ья$/u.test(trimmed)) return trimmed.replace(/ья$/u, "ью");
  if (/ша$/u.test(trimmed)) return trimmed.replace(/ша$/u, "шу");
  if (/[бвгджзклмнпрстфхцчшщ]а$/u.test(trimmed)) {
    return trimmed.replace(/а$/u, "у");
  }
  return trimmed;
}

function guessGenitive(name: string): string {
  const trimmed = name.trim();
  if (/ия$/u.test(trimmed)) return trimmed.replace(/ия$/u, "ии");
  if (/ья$/u.test(trimmed)) return trimmed.replace(/ья$/u, "ьи");
  if (/ша$/u.test(trimmed)) return trimmed.replace(/ша$/u, "ши");
  if (/[бвгджзклмнпрстфхцчшщ]а$/u.test(trimmed)) {
    return trimmed.replace(/а$/u, "ы");
  }
  if (/й$/u.test(trimmed)) return `${trimmed.slice(0, -1)}я`;
  if (/ь$/u.test(trimmed)) return `${trimmed.slice(0, -1)}я`;
  return `${trimmed}а`;
}

function guessGender(name: string): TeamGender {
  const trimmed = name.trim();
  if (/ия$/u.test(trimmed) || /[бвгджзклмнпрстфхцчшщ]а$/u.test(trimmed)) {
    return "f";
  }
  return "m";
}

function formsFor(name: string): TeamGrammaticalForms {
  const trimmed = name.trim();
  const known = TEAM_FORMS[trimmed];
  if (known) return known;
  return {
    accusative: guessAccusative(trimmed),
    genitive: guessGenitive(trimmed),
    gender: guessGender(trimmed),
  };
}

export function teamNominative(name: string): string {
  return name.trim();
}

export function teamAccusative(name: string): string {
  return formsFor(name).accusative;
}

export function teamGenitive(name: string): string {
  return formsFor(name).genitive;
}

export function teamGender(name: string): TeamGender {
  return formsFor(name).gender;
}

/** «верила / верил / верили» для сборной */
export function teamBelievedForm(name: string): string {
  const gender = teamGender(name);
  if (gender === "pl") return "верили";
  if (gender === "f") return "верила";
  return "верил";
}

/** «в неё / в него / в них» */
export function teamBeliefPronoun(name: string): string {
  const gender = teamGender(name);
  if (gender === "pl") return "них";
  if (gender === "f") return "неё";
  return "него";
}
