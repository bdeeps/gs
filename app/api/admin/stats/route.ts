import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppMetrics } from "@/lib/app-metrics";
import { findAccountByEmail } from "@/lib/gurudwara-accounts";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

async function requireSignedInAccount() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload?.email) {
    return null;
  }

  return findAccountByEmail(payload.email);
}

export async function GET() {
  const account = await requireSignedInAccount();
  if (!account) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const metrics = await getAppMetrics();
  return NextResponse.json({ metrics });
}

