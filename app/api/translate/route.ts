import { NextResponse } from "next/server";
import { incrementAppMetrics } from "@/lib/app-metrics";
import { getAppSettings } from "@/lib/app-settings";
import { translateToHindi } from "@/lib/translate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const settings = await getAppSettings();
  if (!settings.enableHindiTranslation) {
    return NextResponse.json({ translatedText: null });
  }

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ translatedText: null });
  }

  const translatedText = await translateToHindi(text);
  await incrementAppMetrics({
    totalTranslationsRequested: 1,
    totalTranslationsSucceeded: translatedText ? 1 : 0
  });
  return NextResponse.json({ translatedText });
}
