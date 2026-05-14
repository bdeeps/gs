import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findAccountByEmail } from "@/lib/gurudwara-accounts";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifySessionToken(token);
  if (!payload?.sub) {
    return NextResponse.json({ user: null });
  }

  const account = await findAccountByEmail(payload.email);
  if (!account) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: account.id,
      email: account.email,
      name: account.gurudwara_name,
      verified: Boolean(account.email_verified_at)
    }
  });
}
