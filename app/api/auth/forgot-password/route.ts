import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getRequestOrigin } from "@/lib/app-origin";
import { findAccountByEmail, setPasswordResetToken } from "@/lib/gurudwara-accounts";
import { PlinthError, sendPasswordResetEmail } from "@/lib/plinth";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  const account = await findAccountByEmail(email);
  if (!account) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await setPasswordResetToken(account.id, token, expiresAt);

  const origin = getRequestOrigin(request);
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  const firstName = account.gurudwara_name.slice(0, 80);

  try {
    await sendPasswordResetEmail(account.email, firstName, resetUrl, clientIp(request));
  } catch (e) {
    console.error("[forgot-password] plinth", e);
    if (e instanceof PlinthError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not send reset email. Try again later." }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: `If an account exists for ${email}, we sent reset instructions to that inbox.`
  });
}
