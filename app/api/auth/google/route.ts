import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { GOOGLE_OAUTH_STATE_COOKIE, getGoogleOAuthConfig } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  const state = randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
