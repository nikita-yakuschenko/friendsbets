import { NextResponse } from "next/server";
import { getTelegramWebhookSecret, isTelegramConfigured } from "@/lib/telegram/config";
import { handleTelegramUpdate } from "@/lib/telegram/webhook";

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 503 });
  }

  const expectedSecret = getTelegramWebhookSecret();
  if (expectedSecret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handleTelegramUpdate(update as Parameters<typeof handleTelegramUpdate>[0]);
  } catch (error) {
    console.error("[telegram:webhook]", error);
  }

  return NextResponse.json({ ok: true });
}
