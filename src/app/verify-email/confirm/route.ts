import { NextResponse } from "next/server";
import { getAppOriginFromRequest, absoluteAppUrl } from "@/lib/app-origin";
import { verifyEmailByToken } from "@/lib/email-verification";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const origin = getAppOriginFromRequest(request);

  if (!token) {
    return NextResponse.redirect(
      absoluteAppUrl("/verify-email?error=invalid", origin),
    );
  }

  const result = await verifyEmailByToken(token);

  if (!result.ok) {
    return NextResponse.redirect(
      absoluteAppUrl(`/verify-email?error=${result.reason}`, origin),
    );
  }

  return NextResponse.redirect(absoluteAppUrl("/?verified=1", origin));
}
