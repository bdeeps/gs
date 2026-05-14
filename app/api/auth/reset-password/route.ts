import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findAccountByPasswordResetToken, updatePasswordAndClearReset } from "@/lib/gurudwara-accounts";

export const runtime = "nodejs";

const MIN_PASSWORD = 10;

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Reset link is missing or invalid." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 }
    );
  }

  const account = await findAccountByPasswordResetToken(token);
  if (!account) {
    return NextResponse.json(
      { error: "This reset link has expired or was already used. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await updatePasswordAndClearReset(account.id, passwordHash);

  return NextResponse.json({ ok: true, message: "Your password has been updated. You can sign in." });
}
