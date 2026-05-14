import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "gurbani_session";

function sessionSecret() {
  const raw = process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) {
    return new TextEncoder().encode("dev-insecure-session-secret");
  }
  return new TextEncoder().encode(raw);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  try {
    await jwtVerify(token, sessionSecret());
    return NextResponse.next();
  } catch {
    const login = new URL("/login", request.url);
    login.searchParams.set("session", "expired");
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
