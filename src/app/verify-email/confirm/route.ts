import { NextResponse } from "next/server";
import { verifyEmailByToken } from "@/lib/email-verification";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid", origin),
    );
  }

  const result = await verifyEmailByToken(token);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/verify-email?error=${result.reason}`, origin),
    );
  }

  return NextResponse.redirect(new URL("/?verified=1", origin));
}
