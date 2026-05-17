import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAppSettings,
  updateAppSettings,
  type CardStyle,
  type DisplayTemplate,
  type FontScale,
  type LiveDisplayMode,
  type VerseMode
} from "@/lib/app-settings";
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

  const settings = await getAppSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const account = await requireSignedInAccount();
  if (!account) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        enableHindiTranslation?: unknown;
        displayTemplate?: unknown;
        verseMode?: unknown;
        fontScale?: unknown;
        cardStyle?: unknown;
        liveDisplayMode?: unknown;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: {
    enableHindiTranslation?: boolean;
    displayTemplate?: DisplayTemplate;
    verseMode?: VerseMode;
    fontScale?: FontScale;
    cardStyle?: CardStyle;
    liveDisplayMode?: LiveDisplayMode;
  } = {};

  if (typeof body.enableHindiTranslation === "boolean") {
    patch.enableHindiTranslation = body.enableHindiTranslation;
  }

  if (
    body.displayTemplate === "darbar_focus" ||
    body.displayTemplate === "shabad_pair" ||
    body.displayTemplate === "shabad_pair_vertical" ||
    body.displayTemplate === "seva_stream" ||
    body.displayTemplate === "pothi_panel" ||
    body.displayTemplate === "maryada_minimal"
  ) {
    patch.displayTemplate = body.displayTemplate;
  }

  if (body.verseMode === "single" || body.verseMode === "two" || body.verseMode === "streaming") {
    patch.verseMode = body.verseMode;
  }

  if (body.fontScale === "large" || body.fontScale === "xlarge" || body.fontScale === "projection") {
    patch.fontScale = body.fontScale;
  }

  if (body.cardStyle === "none" || body.cardStyle === "soft" || body.cardStyle === "elevated") {
    patch.cardStyle = body.cardStyle;
  }

  if (body.liveDisplayMode === "timeline" || body.liveDisplayMode === "single_english") {
    patch.liveDisplayMode = body.liveDisplayMode;
  }

  const settings = await updateAppSettings(patch);
  return NextResponse.json({ ok: true, settings });
}

