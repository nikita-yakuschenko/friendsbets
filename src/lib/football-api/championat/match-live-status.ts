export type ChampionatLivePhase =
  | "scheduled"
  | "live"
  | "halftime"
  | "extra_time"
  | "penalties"
  | "finished";

export type ChampionatMatchPeriod =
  | "first_half"
  | "second_half"
  | "extra_time"
  | "penalty_shootout";

export type ChampionatLiveStatus = {
  phase: ChampionatLivePhase;
  period?: ChampionatMatchPeriod;
  /** Минута на табло (1–120+), не номер тайма */
  minute?: number;
  rawText: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function readChampionatMatchStatusText(html: string): string {
  const match = html.match(
    /<div class="match-info__status">\s*([\s\S]*?)<\/div>/i,
  );
  if (!match) return "";
  return normalizeWhitespace(match[1].replace(/<[^>]+>/g, ""));
}

function parseMinute(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Разбор строки статуса с карточки матча Championat. */
export function parseChampionatLiveStatusText(
  text: string,
): ChampionatLiveStatus | null {
  const raw = normalizeWhitespace(text);
  if (!raw) return null;

  if (/перенес|отмен/i.test(raw)) {
    return { phase: "scheduled", rawText: raw };
  }
  if (/не\s+начал/i.test(raw)) {
    return { phase: "scheduled", rawText: raw };
  }
  if (/заверш|окончен/i.test(raw)) {
    return { phase: "finished", rawText: raw };
  }
  if (/перерыв/i.test(raw)) {
    return { phase: "halftime", rawText: raw };
  }

  if (/сери[яи]\s+пенальти|пенальти.*сери/i.test(raw)) {
    const penMin = raw.match(/(\d+)\s*[''′]?/);
    return {
      phase: "penalties",
      period: "penalty_shootout",
      minute: parseMinute(penMin?.[1]),
      rawText: raw,
    };
  }

  const extraMatch = raw.match(
    /(?:доп\.?\s*врем(?:я|ени)|дополнительное\s+время)(?:\s*,\s*(\d+)\s*[''′]?)?/i,
  );
  if (extraMatch) {
    return {
      phase: "extra_time",
      period: "extra_time",
      minute: parseMinute(extraMatch[1]),
      rawText: raw,
    };
  }

  const halfMatch = raw.match(
    /(1|2)-?\s*й\s+тайм(?:\s*,\s*(\d+)\s*[''′]?)?/i,
  );
  if (halfMatch) {
    const half = halfMatch[1] === "1" ? "first_half" : "second_half";
    return {
      phase: "live",
      period: half,
      minute: parseMinute(halfMatch[2]),
      rawText: raw,
    };
  }

  if (/идёт|идет|в эфире/i.test(raw)) {
    return { phase: "live", rawText: raw };
  }

  return null;
}

export function parseChampionatLiveStatusFromHtml(
  html: string,
): ChampionatLiveStatus {
  const rawText = readChampionatMatchStatusText(html);
  const parsed = parseChampionatLiveStatusText(rawText);
  if (parsed) return parsed;

  // Превью будущего матча: в title «смотреть онлайн / трансляция», на странице «Не начался».
  if (/не\s+начал/i.test(rawText)) {
    return { phase: "scheduled", rawText: rawText };
  }

  // LIVE по title только если в заголовке уже есть счёт (идёт матч), не реклама трансляции.
  const titleLive = html.match(/<title>[^<]*/i)?.[0] ?? "";
  if (
    /(?:трансляц|онлайн)/i.test(titleLive) &&
    /сч[её]т\s+\d+\s*:\s*\d+/i.test(titleLive)
  ) {
    return { phase: "live", rawText: rawText || "онлайн" };
  }

  return { phase: "scheduled", rawText: rawText };
}

export function parseChampionatLivePhaseFromHtml(
  html: string,
): ChampionatLivePhase {
  return parseChampionatLiveStatusFromHtml(html).phase;
}

export type LiveBadgeVariant = "live" | "halftime";

/** Текст и стиль бейджа по статусу Championat. */
export function formatLiveBadgeLabel(status: ChampionatLiveStatus): string {
  const { phase, period, minute } = status;
  const minPart = minute != null ? `, ${minute}'` : "";

  if (phase === "halftime") return "ПЕРЕРЫВ";

  if (phase === "penalties" || period === "penalty_shootout") {
    return "СЕРИЯ ПЕНАЛЬТИ";
  }

  if (phase === "extra_time" || period === "extra_time") {
    return minute != null ? `ДОП. ВРЕМЯ${minPart}` : "ДОП. ВРЕМЯ";
  }

  if (period === "first_half") {
    return minute != null ? `ИДЁТ 1-й тайм${minPart}` : "ИДЁТ 1-й тайм";
  }

  if (period === "second_half") {
    return minute != null ? `ИДЁТ 2-й тайм${minPart}` : "ИДЁТ 2-й тайм";
  }

  if (phase === "live") {
    return "ИДЁТ СЕЙЧАС";
  }

  return "ИДЁТ СЕЙЧАС";
}

export function liveBadgeVariantFromStatus(
  status: ChampionatLiveStatus,
): LiveBadgeVariant {
  return status.phase === "halftime" ? "halftime" : "live";
}
