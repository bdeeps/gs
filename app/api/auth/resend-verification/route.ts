import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getRequestOrigin } from "@/lib/app-origin";
import { findAccountByEmail, refreshVerificationToken } from "@/lib/gurudwara-accounts";
import { PlinthError, sendEmailVerificationLink } from "@/lib/plinth";

export const runtime = "nodejs";

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
  if (!account || account.email_verified_at) {
    return NextResponse.json({ ok: true });
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await refreshVerificationToken(account.id, verificationToken, verificationExpiresAt);

  const origin = getRequestOrigin(request);
  const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  try {
    await sendEmailVerificationLink(
      account.email,
      account.gurudwara_name.slice(0, 80),
      verifyUrl
    );
  } catch (e) {
    console.error("[resend-verification]", e);
    if (e instanceof PlinthError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not send email." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, message: "Verification email sent." });
}
