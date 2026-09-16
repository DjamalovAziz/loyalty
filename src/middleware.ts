import { auth } from "~/server/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/dashboard")) {
    if (!session || session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.redirect(new URL("/signin", req.url));
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/signin" && (!session || session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.redirect(new URL("/admin/signin", req.url));
    }
  }

  if (pathname.match(/^\/staff\/[^/]+\/panel/)) {
    const slug = pathname.split("/")[2];
    if (!session || session.user.role !== "STAFF" || session.user.businessSlug !== slug) {
      return NextResponse.redirect(new URL(`/staff/${slug}/signin`, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/staff/:path*", "/admin/:path*"],
};
