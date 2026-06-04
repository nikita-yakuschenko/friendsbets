import { absoluteAppUrl } from "@/lib/app-origin";
import { escapeHtml } from "@/lib/email/escape";

/** Шрифт Inter + системные запасные (для клиентов без веб-шрифтов). */
export const EMAIL_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Светлая палитра для писем. */
export const EMAIL_BRAND = {
  pageBg: "#f3f4f6",
  cardBg: "#ffffff",
  cardBorder: "#e5e7eb",
  accentBg: "#f9fafb",
  heading: "#111827",
  text: "#374151",
  muted: "#6b7280",
  lime: "#84cc16",
  limeDark: "#3f6212",
  divider: "#e5e7eb",
} as const;

const FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />';

type EmailLayoutOptions = {
  preheader?: string;
  badge?: string;
  title: string;
  introHtml: string;
  blocksHtml?: string;
  cta?: { label: string; href: string };
  footnote?: string;
  /** Абсолютный URL PNG/SVG (по умолчанию /favicon.png на NEXT_PUBLIC_APP_URL). */
  logoUrl?: string;
};

function cellFont(): string {
  return `font-family:${EMAIL_FONT};`;
}

function preheaderHtml(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(text)}</div>`;
}

function emailButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 0;">
  <tr>
    <td align="left">
      <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block;padding:12px 22px;${cellFont()}font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;background-color:${EMAIL_BRAND.limeDark};border-radius:8px;">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`;
}

function emailHeader(logoUrl: string): string {
  const safeLogo = escapeHtml(logoUrl);
  return `
<tr>
  <td align="left" style="padding:36px 40px 20px;${cellFont()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right:12px;vertical-align:middle;">
          <img src="${safeLogo}" width="40" height="40" alt="FriendsBets"
            style="display:block;width:40px;height:40px;border-radius:8px;border:0;" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${EMAIL_BRAND.heading};">Friends</span><span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${EMAIL_BRAND.limeDark};">Bets</span>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function emailFooter(footnote?: string): string {
  const note = footnote
    ? escapeHtml(footnote)
    : "Вы получили это письмо, потому что участвуете в турнире на FriendsBets.";
  return `
<tr>
  <td align="left" style="padding:24px 40px 36px;border-top:1px solid ${EMAIL_BRAND.divider};${cellFont()}font-size:13px;line-height:1.55;color:${EMAIL_BRAND.muted};">
    ${note}
    <p style="margin:16px 0 0;font-size:12px;color:${EMAIL_BRAND.muted};">© FriendsBets</p>
  </td>
</tr>`;
}

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const logoUrl = options.logoUrl ?? absoluteAppUrl("/favicon.png");
  const badge = options.badge
    ? `<p style="margin:0 0 10px;${cellFont()}font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_BRAND.muted};">${escapeHtml(options.badge)}</p>`
    : "";

  const blocks = options.blocksHtml ?? "";
  const cta = options.cta ? emailButton(options.cta.href, options.cta.label) : "";
  const preheader = options.preheader ? preheaderHtml(options.preheader) : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  ${FONT_LINK}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, table, td, a, p, h1, span { font-family: ${EMAIL_FONT} !important; }
  </style>
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_BRAND.pageBg};${cellFont()}">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_BRAND.pageBg};${cellFont()}">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${EMAIL_BRAND.cardBg};border:1px solid ${EMAIL_BRAND.cardBorder};border-radius:12px;">
          ${emailHeader(logoUrl)}
          <tr>
            <td align="left" style="padding:0 40px 8px;${cellFont()}">
              ${badge}
              <h1 style="margin:0 0 20px;${cellFont()}font-size:22px;line-height:1.35;font-weight:700;color:${EMAIL_BRAND.heading};">${escapeHtml(options.title)}</h1>
              <div style="${cellFont()}font-size:15px;line-height:1.65;color:${EMAIL_BRAND.text};">
                ${options.introHtml}
              </div>
              ${blocks}
              ${cta}
            </td>
          </tr>
          ${emailFooter(options.footnote)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderMatchCard(params: {
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  startsAtLabel: string;
  timeLabel?: string;
}): string {
  const timeBadge = params.timeLabel
    ? `<p style="margin:0 0 10px;${cellFont()}font-size:12px;font-weight:600;color:${EMAIL_BRAND.limeDark};">До начала: ${escapeHtml(params.timeLabel)}</p>`
    : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
  <tr>
    <td align="left" style="padding:18px 20px;background-color:${EMAIL_BRAND.accentBg};border:1px solid ${EMAIL_BRAND.cardBorder};border-radius:10px;${cellFont()}">
      ${timeBadge}
      <p style="margin:0 0 10px;${cellFont()}font-size:18px;font-weight:600;line-height:1.35;color:${EMAIL_BRAND.heading};">
        ${escapeHtml(params.homeTeam)} <span style="color:${EMAIL_BRAND.muted};font-weight:500;">—</span> ${escapeHtml(params.awayTeam)}
      </p>
      <p style="margin:0;${cellFont()}font-size:14px;line-height:1.55;color:${EMAIL_BRAND.muted};">
        Турнир: <span style="color:${EMAIL_BRAND.text};">${escapeHtml(params.gameTitle)}</span><br />
        Начало: <span style="color:${EMAIL_BRAND.text};">${escapeHtml(params.startsAtLabel)}</span>
      </p>
    </td>
  </tr>
</table>`;
}

export function renderNameList(names: string[]): string {
  const items = names
    .map(
      (name) =>
        `<tr><td align="left" style="padding:10px 16px;${cellFont()}font-size:14px;color:${EMAIL_BRAND.text};border-top:1px solid ${EMAIL_BRAND.divider};">${escapeHtml(name)}</td></tr>`,
    )
    .join("");

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;border:1px solid ${EMAIL_BRAND.cardBorder};border-radius:10px;overflow:hidden;">
  <tr>
    <td align="left" style="padding:10px 16px;${cellFont()}font-size:12px;font-weight:600;color:${EMAIL_BRAND.muted};background-color:${EMAIL_BRAND.accentBg};">
      Не сделали прогноз
    </td>
  </tr>
  ${items}
</table>`;
}
