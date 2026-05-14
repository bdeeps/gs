import { NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/app-origin";
import {
  findAccountByVerificationToken,
  markEmailVerified
} from "@/lib/gurudwara-accounts";
import { sendWelcomeEmail } from "@/lib/plinth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";

  if (!token) {
    const site = getRequestOrigin(request);
    return NextResponse.redirect(new URL("/login?verify=missing", site));
  }

  const account = await findAccountByVerificationToken(token);
  if (!account) {
    const site = getRequestOrigin(request);
    return NextResponse.redirect(new URL("/login?verify=invalid", site));
  }

  await markEmailVerified(account.id);

  const origin = getRequestOrigin(request);
  try {
    await sendWelcomeEmail(
      account.email,
      account.gurudwara_name.slice(0, 80),
      `${origin}/dashboard`
    );
  } catch (e) {
    console.error("[verify-email] welcome email", e);
  }

  return NextResponse.redirect(new URL("/login?verified=1", origin));
}
