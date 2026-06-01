import { NextRequest, NextResponse } from "next/server";
import { getFlagCdnUrl, normalizeFlagCode } from "@/lib/flag-proxy";

const CACHE_SECONDS = 60 * 60 * 24 * 30;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const code = normalizeFlagCode(decodeURIComponent(rawCode));
  if (!code) {
    return new NextResponse(null, { status: 400 });
  }

  const scale = request.nextUrl.searchParams.get("scale") === "2" ? 2 : 1;
  const upstream = await fetch(getFlagCdnUrl(code, scale), {
    next: { revalidate: CACHE_SECONDS },
  });

  if (!upstream.ok) {
    return new NextResponse(null, {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}, immutable`,
    },
  });
}
