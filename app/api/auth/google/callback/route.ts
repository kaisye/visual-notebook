import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  getGoogleOAuthConfig,
  isGoogleAccountAllowed,
  signSession,
  verifyGoogleIdToken,
} from "@/lib/auth";

export const runtime = "nodejs";

function loginRedirect(req: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
}

export async function GET(req: NextRequest) {
  const config = getGoogleOAuthConfig();
  if (!config) return loginRedirect(req, "google_not_configured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return loginRedirect(req, "google_state_invalid");
  }

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();
  let idToken = "";
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }
    const tokenData = (await tokenRes.json()) as { id_token?: string };
    idToken = tokenData.id_token ?? "";
  } catch {
    return loginRedirect(req, "google_token_failed");
  }

  try {
    const profile = await verifyGoogleIdToken(idToken, config.clientId);
    if (!isGoogleAccountAllowed(profile.email)) {
      return loginRedirect(req, "google_account_not_allowed");
    }

    const token = await signSession(`google:${profile.sub}`, {
      email: profile.email,
      name: profile.name,
      provider: "google",
    });
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return loginRedirect(req, "google_verify_failed");
  }
}
