import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const COOKIE_NAME = "gurbani_session";

export { COOKIE_NAME };

function getSecretKey() {
  const raw = process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to at least 16 characters.");
    }
    return new TextEncoder().encode("dev-insecure-session-secret");
  }
  return new TextEncoder().encode(raw);
}

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
  verified: boolean;
};

export async function signSession(payload: {
  userId: string;
  email: string;
  name: string;
  verified: boolean;
}): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    verified: payload.verified
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    const verified = Boolean(payload.verified);
    if (!sub || !email) {
      return null;
    }
    return { ...payload, sub, email, name, verified };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec
  };
}
