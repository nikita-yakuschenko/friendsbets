import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ACTIVE_GAME_COOKIE,
  ACTIVE_GAME_COOKIE_MAX_AGE,
} from "@/lib/active-game-cookie";

function normalizeGameRouteInvite(segment: string): string {
  try {
    return decodeURIComponent(segment).trim().toUpperCase();
  } catch {
    return segment.trim().toUpperCase();
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const gameMatch = pathname.match(/^\/game\/([^/]+)/);
  if (gameMatch) {
    const invite = normalizeGameRouteInvite(gameMatch[1]);
    if (/^[A-Z0-9]{4,32}$/.test(invite)) {
      response.cookies.set(ACTIVE_GAME_COOKIE, invite, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ACTIVE_GAME_COOKIE_MAX_AGE,
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/game/:path*",
    "/",
    "/profile",
    "/create",
    "/join",
    "/add-tournament",
    "/admin/:path*",
  ],
};
