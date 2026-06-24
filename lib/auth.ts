import { SignJWT, jwtVerify } from "jose";

/**
 * Minimal single-user auth: a shared password gates the app. On success we set a
 * signed (HS256) session cookie; middleware verifies it. No database required.
 *
 * Configure via env on Vercel:
 *   AUTH_SECRET  - random secret for signing (required in production)
 *   APP_PASSWORD - the login password (required in production)
 */

export const SESSION_COOKIE = "vn_session";
const SESSION_TTL = "30d";

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

export async function signSession(): Promise<string> {
  return new SignJWT({ sub: "owner" })
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
