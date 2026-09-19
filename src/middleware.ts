import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-forwarded-for", ip);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/trpc/:path*", "/api/telegram/:path*"],
};
