import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/app-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[config] failed to load settings", error);
    return NextResponse.json(
      {
        settings: {
          enableHindiTranslation: false,
          displayTemplate: "darbar_focus",
          verseMode: "single",
          fontScale: "xlarge",
          cardStyle: "soft",
          liveDisplayMode: "timeline"
        }
      },
      { status: 200 }
    );
  }
}

