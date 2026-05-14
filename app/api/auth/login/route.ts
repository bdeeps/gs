import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findAccountByEmail } from "@/lib/gurudwara-accounts";
import { COOKIE_NAME, sessionCookieOptions, signSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const account = await findAccountByEmail(email);
  if (!account) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, account.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSession({
    userId: account.id,
    email: account.email,
    name: account.gurudwara_name,
    verified: Boolean(account.email_verified_at)
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, sessionCookieOptions(14 * 24 * 60 * 60));

  return NextResponse.json({
    ok: true,
    user: {
      email: account.email,
      name: account.gurudwara_name,
      verified: Boolean(account.email_verified_at)
    }
  });
}
