import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransport(): Transporter | null {
  if (!isSmtpConfigured()) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
}

let transport: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (transport === undefined) {
    transport = createTransport();
  }
  return transport;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transporter = getTransport();

  if (!transporter) {
    console.info("[email:mock]", input.to, input.subject, input.text);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? input.text.replace(/\n/g, "<br>"),
  });
}
