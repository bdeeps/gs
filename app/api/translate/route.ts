import { NextResponse } from "next/server";
import { translateToHindi } from "@/lib/translate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ translatedText: null });
  }

  const translatedText = await translateToHindi(text);
  return NextResponse.json({ translatedText });
}
