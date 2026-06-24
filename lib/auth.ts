import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Minimal single-user auth: a shared password gates the app. On success we set a
 * signed (HS256) session cookie; middleware verifies it. No database required.
 *
 * Configure via env on Vercel:
 *   AUTH_SECRET  - random secret for signing (required in production)
 *   APP_PASSWORD - the login password (required in production)
 */

export const SESSION_COOKIE = "vn_session";
export const GOOGLE_OAUTH_STATE_COOKIE = "vn_google_oauth_state";
const SESSION_TTL = "30d";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function devFallback(name: string, value: string): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var ${name} in production`);
  }
  return value;
}

export function getAuthSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? devFallback("AUTH_SECRET", "dev-insecure-secret-change-me");
  return new TextEncoder().encode(secret);
}

export function getAppPassword(): string {
  return process.env.APP_PASSWORD ?? devFallback("APP_PASSWORD", "visualnotebook");
}

export async function signSession(subject = "owner", extraClaims: Record<string, unknown> = {}): Promise<string> {
  return new SignJWT({ sub: subject, ...extraClaims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getAuthSecret());
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getAuthSecret());
    return true;
  } catch {
    return false;
  }
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getAllowedGoogleEmails(): Set<string> {
  return new Set(
    (process.env.GOOGLE_ALLOWED_EMAILS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getAllowedGoogleDomains(): Set<string> {
  return new Set(
    (process.env.GOOGLE_ALLOWED_DOMAINS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isGoogleAccountAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const allowedEmails = getAllowedGoogleEmails();
  const allowedDomains = getAllowedGoogleDomains();
  if (!allowedEmails.size && !allowedDomains.size) return true;
  const domain = normalized.split("@")[1] ?? "";
  return allowedEmails.has(normalized) || allowedDomains.has(domain);
}

export async function verifyGoogleIdToken(idToken: string, clientId: string) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: clientId,
    issuer: GOOGLE_ISSUERS,
  });
  const email = typeof payload.email === "string" ? payload.email : "";
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!email || !emailVerified) {
    throw new Error("Google account email is not verified");
  }
  return {
    sub: String(payload.sub ?? ""),
    email,
    name: typeof payload.name === "string" ? payload.name : "",
    picture: typeof payload.picture === "string" ? payload.picture : "",
  };
}
