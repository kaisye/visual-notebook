import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";

/** Gate every page/API route behind the session cookie, except the login flow. */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifyToken(token);

  if (isPublic) {
    if (pathname === "/login" && authed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
