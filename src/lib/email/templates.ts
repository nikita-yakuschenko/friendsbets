import { escapeHtml } from "@/lib/email/escape";
import {
  EMAIL_BRAND,
  renderEmailLayout,
  renderMatchCard,
  renderNameList,
} from "@/lib/email/layout";

export type EmailContent = { text: string; html: string };

export function buildEmailVerificationContent(params: {
  userName: string;
  link: string;
}): EmailContent {
  const text = [
    `Здравствуйте, ${params.userName}!`,
    "",
    "Подтвердите email, чтобы пользоваться FriendsBets:",
    params.link,
    "",
    "Ссылка действует 24 часа.",
    "",
    "— FriendsBets",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: "Подтвердите email для доступа к FriendsBets",
    badge: "Подтверждение email",
    title: "Подтвердите почту",
    introHtml: `
      <p style="margin:0 0 14px;">Здравствуйте, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(params.userName)}</strong>!</p>
      <p style="margin:0;">Нажмите кнопку ниже, чтобы подтвердить адрес и получить доступ к турнирам и прогнозам.</p>`,
    cta: { label: "Подтвердить email", href: params.link },
    footnote: "Ссылка действует 24 часа. Если вы не регистрировались на FriendsBets, просто проигнорируйте письмо.",
  });

  return { text, html };
}

export function buildTestEmailContent(userName: string): EmailContent {
  const text = [
    `Здравствуйте, ${userName}!`,
    "",
    "Это тестовое письмо с платформы FriendsBets.",
    "Если вы его читаете, доставка на ваш адрес работает.",
    "",
    "Напоминания о прогнозах приходят с того же отправителя.",
    "",
    "— FriendsBets",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: "Проверка доставки почты FriendsBets",
    badge: "Тест доставки",
    title: "Почта работает",
    introHtml: `
      <p style="margin:0 0 14px;">Здравствуйте, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(userName)}</strong>!</p>
      <p style="margin:0 0 14px;">Это тестовое письмо с платформы FriendsBets. Если вы его читаете, доставка на ваш адрес настроена правильно.</p>
      <p style="margin:0;">Напоминания о прогнозах приходят с того же отправителя и в таком же оформлении.</p>`,
    footnote:
      "Тестовое письмо отправлено администратором платформы для проверки доставки.",
  });

  return { text, html };
}

export function buildPredictionReminderEmail(params: {
  userName: string;
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  startsAtLabel: string;
  timeLabel: string;
  link: string;
}): EmailContent {
  const matchLine = `${params.homeTeam} — ${params.awayTeam}`;
  const text = [
    `Привет, ${params.userName}!`,
    "",
    `До матча ${matchLine} осталось ${params.timeLabel}.`,
    `Начало: ${params.startsAtLabel}.`,
    `Турнир: ${params.gameTitle}.`,
    "",
    "Вы ещё не сделали прогноз. Успейте до начала матча:",
    params.link,
    "",
    "— FriendsBets",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Прогноз через ${params.timeLabel}: ${matchLine}`,
    badge: `Напоминание · ${params.timeLabel}`,
    title: "Успейте поставить прогноз",
    introHtml: `
      <p style="margin:0 0 14px;">Привет, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(params.userName)}</strong>!</p>
      <p style="margin:0;">Вы ещё не сделали прогноз на этот матч. Успейте до начала игры.</p>`,
    blocksHtml: renderMatchCard({
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
      gameTitle: params.gameTitle,
      startsAtLabel: params.startsAtLabel,
      timeLabel: params.timeLabel,
    }),
    cta: { label: "Сделать прогноз", href: params.link },
    footnote: "Письмо отправлено автоматически, потому что до матча осталось мало времени.",
  });

  return { text, html };
}

export function buildAdminMissingPredictionsEmail(params: {
  adminName: string;
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  startsAtLabel: string;
  timeLabel: string;
  missingNames: string[];
  link: string;
}): EmailContent {
  const matchLine = `${params.homeTeam} — ${params.awayTeam}`;
  const list = params.missingNames.map((name) => `- ${name}`).join("\n");
  const text = [
    `Привет, ${params.adminName}!`,
    "",
    `До матча ${matchLine} осталось ${params.timeLabel}.`,
    `Начало: ${params.startsAtLabel}.`,
    `Турнир: ${params.gameTitle}.`,
    "",
    "Не сделали прогноз:",
    list,
    "",
    params.link,
    "",
    "— FriendsBets",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Кто не поставил: ${params.missingNames.length} чел. · ${matchLine}`,
    badge: `Организатору · ${params.timeLabel}`,
    title: "Кто ещё не поставил",
    introHtml: `
      <p style="margin:0 0 14px;">Привет, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(params.adminName)}</strong>!</p>
      <p style="margin:0;">До начала матча осталось ${escapeHtml(params.timeLabel)}. Ниже — участники без прогноза.</p>`,
    blocksHtml:
      renderMatchCard({
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        gameTitle: params.gameTitle,
        startsAtLabel: params.startsAtLabel,
        timeLabel: params.timeLabel,
      }) + renderNameList(params.missingNames),
    cta: { label: "Открыть контроль", href: params.link },
    footnote:
      "Письмо для организатора турнира: сводка по участникам без прогноза.",
  });

  return { text, html };
}
