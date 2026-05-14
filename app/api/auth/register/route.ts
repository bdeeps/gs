import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getRequestOrigin } from "@/lib/app-origin";
import { getPool } from "@/lib/db";
import { findAccountByEmail, insertGurudwaraAccount } from "@/lib/gurudwara-accounts";
import { PlinthError, sendEmailVerificationLink } from "@/lib/plinth";

export const runtime = "nodejs";

const MIN_PASSWORD = 10;

export async function POST(request: Request) {
  let body: { email?: string; password?: string; gurudwaraName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const gurudwaraName = typeof body.gurudwaraName === "string" ? body.gurudwaraName.trim() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 }
    );
  }
  if (!gurudwaraName || gurudwaraName.length < 2) {
    return NextResponse.json({ error: "Enter your Gurudwara or organization name." }, { status: 400 });
  }

  const existing = await findAccountByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in or reset your password." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  let account;
  try {
    account = await insertGurudwaraAccount({
      email,
      passwordHash,
      gurudwaraName,
      verificationToken,
      verificationExpiresAt
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    throw e;
  }

  const origin = getRequestOrigin(request);
  const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;
  const firstName = gurudwaraName.slice(0, 80);

  try {
    await sendEmailVerificationLink(account.email, firstName, verifyUrl);
  } catch (err) {
    await getPool().query(`DELETE FROM gurudwara_accounts WHERE id = $1::uuid`, [account.id]);
    const message = err instanceof PlinthError ? err.message : "Could not send verification email.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: "Check your email for a link to confirm your address."
  });
}
